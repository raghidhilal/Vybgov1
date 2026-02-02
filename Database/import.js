const admin = require('firebase-admin');
const fs = require('fs');
const serviceAccount = require('./config.json'); // Your Firebase service account
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();
// Recursive function to convert JSON back to Firestore types
function convertFromJSONTypes(obj) {
  for (let key in obj) {
    const value = obj[key];
    // Convert timestamps
    if (
      value &&
      typeof value === 'object' &&
      value.__datatype__ === 'timestamp' &&
      value.value
    ) {
      obj[key] = new admin.firestore.Timestamp(
        value.value._seconds,
        value.value._nanoseconds
      );
    }
    // Convert geopoints
    else if (
      value &&
      typeof value === 'object' &&
      value.__datatype__ === 'geopoint' &&
      value.value
    ) {
      obj[key] = new admin.firestore.GeoPoint(
        value.value._latitude,
        value.value._longitude
      );
    }
    // Nested object: recurse
    else if (value && typeof value === 'object') {
      convertFromJSONTypes(value);
    }
  }
}
async function importFirestoreJSON(filePath) {
  const backup = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  for (const collectionName of Object.keys(backup)) {
    const docs = backup[collectionName];
    for (const doc of docs) {
      const docId = doc.id; // backup contains id field
      convertFromJSONTypes(doc);
      // Store the doc with both document ID and id field inside
      await db.collection(collectionName).doc(docId).set({
        ...doc,
        id: docId
      });
      console.log(`:white_tick: Imported doc: ${collectionName}/${docId}`);
    }
  }
  console.log(':tada: Firestore import complete!');
}
// Usage
importFirestoreJSON('database.json').catch(console.error);