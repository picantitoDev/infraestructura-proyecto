const { redisClient } = require("./redis");

async function invalidate(keys) {
  for (const key of keys) {
    await redisClient.del(key);
  }
}

module.exports = {
  afterVenta: () =>
    invalidate([
      "movimientos:all",
      "productos:all",
      "clientes:all",
      "productos:criticos",
      "productos:paraOrden"
    ]),

  afterEntrada: () =>
    invalidate([
      "movimientos:all",
      "ordenes:all",
      "productos:all",
      "incidencias:all",
      "productos:criticos",
      "productos:paraOrden"
    ]),

  afterMerma: () =>
    invalidate([
      "movimientos:all",
      "movimientos:mermas30d",
      "productos:all"
    ]),

  afterSobrante: () =>
    invalidate([
      "movimientos:all",
      "movimientos:sobrantes30d",
      "productos:all"
    ])
};
