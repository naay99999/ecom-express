# MongoDB replica set for checkout

Checkout uses MongoDB transactions, so it requires a replica set. A single-node replica set is sufficient for local development.

Run MongoDB locally, then initialize the replica set once:

```bash
docker run -d --name ecommerce-mongo -p 27017:27017 mongo:7 --replSet rs0 --bind_ip_all
docker exec ecommerce-mongo mongosh --eval 'rs.initiate()'
```

Set `MONGO_URI` in `.env` to include the replica-set name:

```dotenv
MONGO_URI=mongodb://127.0.0.1:27017/express_ecommerce?replicaSet=rs0
```

Run the opt-in transaction integration test where local port binding is permitted:

```bash
npm run test:integration
```

Before deploying the variant-based catalog schema to a database that has existing products or carts, run:

```bash
npm run migrate:product-variants
```
