import { Firestore } from '@google-cloud/firestore';

let _firestore: Firestore | null = null;

export function getFirestore(): Firestore {
  if (!_firestore) {
    _firestore = new Firestore({
      projectId: process.env.GOOGLE_CLOUD_PROJECT || 'local-dev',
    });
  }
  return _firestore;
}
