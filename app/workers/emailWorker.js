// workers/emailWorker.js
const amqplib = require("amqplib");
const nodemailer = require("nodemailer");

(async () => {
  try {
    const conn = await amqplib.connect(process.env.RABBITMQ_URL);
    const channel = await conn.createChannel();
    const queue = "email_notifications";

    await channel.assertQueue(queue, { durable: true });
    console.log("Email worker listening on:", queue);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "stockcloud.soporte@gmail.com",
        pass: "xxx eojo eaxt", // contraseña de aplicación
      },
    });

    channel.consume(queue, async (msg) => {
      if (!msg) return;
      const data = JSON.parse(msg.content.toString());

      try {
        // Decode PDF attachment
        if (data.attachments) {
          data.attachments = data.attachments.map((att) => ({
            filename: att.filename,
            content: Buffer.from(att.content, "base64"),
            encoding: "base64",
            contentType: "application/pdf",
          }));
        }

        await transporter.sendMail(data);
        console.log(`Email sent to ${data.to}`);
        channel.ack(msg);
      } catch (err) {
        console.error("Error sending email:", err);
      }
    });
  } catch (err) {
    console.error("Worker crashed:", err);
  }
})();
