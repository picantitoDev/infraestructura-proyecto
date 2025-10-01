const session = require('express-session');
const { PrismaClient } = require('@prisma/client');

// Extend express-session's Store class
const Store = session.Store;

const prisma = new PrismaClient();

class PrismaSessionStore extends Store {
  constructor() {
    super(); // Initialize the parent Store class
  }

  async get(sid, callback) {
    try {
      const session = await prisma.session.findUnique({
        where: { id: sid },
      });
      if (!session || session.expires < new Date()) {
        return callback(null, null);
      }
      callback(null, session.data);
    } catch (err) {
      callback(err);
    }
  }

  async set(sid, sessionData, callback) {
    try {
      console.log('Session data being saved:', sessionData); // Debug log
      const maxAge = sessionData.cookie?.maxAge || 24 * 60 * 60 * 1000; // Fallback to 24 hours
      const expires = new Date(Date.now() + maxAge);
      await prisma.session.upsert({
        where: { id: sid },
        update: { data: sessionData, expires },
        create: { id: sid, data: sessionData, expires },
      });
      callback(null);
    } catch (err) {
      callback(err);
    }
  }

  async destroy(sid, callback) {
    try {
      await prisma.session.delete({
        where: { id: sid },
      });
      callback(null);
    } catch (err) {
      if (err.code === 'P2025') {
        callback(null); // Session not found, treat as success
      } else {
        callback(err);
      }
    }
  }
}

module.exports = { PrismaSessionStore, prisma };
