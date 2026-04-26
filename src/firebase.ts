/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// User provided config
const firebaseConfig = {
  apiKey: "AIzaSyAGYzH-Uml63_bp1y3rZkj_j-svKTAl_dg",
  authDomain: "e-form2.firebaseapp.com",
  projectId: "e-form2",
  storageBucket: "e-form2.firebasestorage.app",
  messagingSenderId: "325770764747",
  appId: "1:325770764747:web:8c2d5dcd04ad070b8e164e"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
