(function () {
  const firebaseConfig = {
    apiKey: "AIzaSyBM3pTohtc58__-YYYWbpe_RtVAn2v7anE",
    authDomain: "sentinel-3a62b.firebaseapp.com",
    projectId: "sentinel-3a62b",
    storageBucket: "sentinel-3a62b.firebasestorage.app",
    messagingSenderId: "423905184502",
    appId: "1:423905184502:web:c5cd36755a51aa45543ad7",
    measurementId: "G-CH1YD1MH33"
  };

  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();

  window.fbLB = {
    save: function (difficulty, entry) {
      return db.collection("leaderboards").doc(difficulty).collection("entries").add({
        name: entry.name,
        score: entry.score,
        waves: entry.waves,
        bytes: entry.bytes || 0,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
    },
    load: function (difficulty, limit) {
      limit = limit || 25;
      return db.collection("leaderboards").doc(difficulty).collection("entries")
        .orderBy("score", "desc")
        .limit(limit)
        .get()
        .then(function (snap) {
          return snap.docs.map(function (d) { return d.data(); });
        });
    }
  };
})();
