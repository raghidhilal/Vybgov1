const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccount = require('./config.json'); // your service account
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

function convertGeoPoints(obj) {
  // Recursive function to process nested objects
  for (let key in obj) {
    const value = obj[key];

    // Firestore Timestamp
    if (value instanceof admin.firestore.Timestamp) {
      obj[key] = {
        "__datatype__": "timestamp",
        value: {
          "_seconds": value.seconds,
          "_nanoseconds": value.nanoseconds
        }
      };
    }

    // Firestore GeoPoint
    else if (value instanceof admin.firestore.GeoPoint) {
      obj[key] = {
        "__datatype__": "geopoint",
        value: {
          "_latitude": value.latitude,
          "_longitude": value.longitude
        }
      };
    }

    // Nested object, possibly containing a GeoPoint map
    else if (
      value &&
      typeof value === 'object'
    ) {
      // Detect map with _latitude/_longitude
      if (value._latitude !== undefined && value._longitude !== undefined) {
        obj[key] = {
          "__datatype__": "geopoint",
          value: {
            "_latitude": value._latitude,
            "_longitude": value._longitude
          }
        };
      } else {
        // Recursively process nested objects
        convertGeoPoints(value);
      }
    }
  }
}

async function exportAllCollections() {
  const collections = await db.listCollections();
  const data = {};

  for (const collection of collections) {
    const snapshot = await collection.get();
    data[collection.id] = [];

    for (const doc of snapshot.docs) {
      const docData = doc.data();

      // Convert timestamps and geopoints recursively
      convertGeoPoints(docData);

      data[collection.id].push({ id: doc.id, ...docData });
    }
  }

  fs.writeFileSync('database.json', JSON.stringify(data, null, 2));
  console.log('✅ Export complete with nested GeoPoints preserved!');
}

exportAllCollections().catch(console.error);
