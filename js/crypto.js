import {sha256} from './hashes/sha2.js';

const CHUNK_SIZE = 20*1024*1024;
const IV_SIZE = 12;
const GCM_TAG_SIZE = 16;
const ENCRYPTED_CHUNK_SIZE = CHUNK_SIZE + IV_SIZE + GCM_TAG_SIZE;

async function generateEncryptionKey(){
    return await crypto.subtle.generateKey({
    name: "AES-GCM",
    length: 256,
  },
  true,
  ["encrypt", "decrypt"]);
}

async function exportKey(key){
    const raw = await crypto.subtle.exportKey('raw',key);
    return toBase64(raw);

}

async function importKey(base64Key){
    const array = toUnit8Array(base64Key);
    const key = await crypto.subtle.importKey('raw',array,{ name: "AES-GCM" },false,['decrypt']);
    return key;
}

async function encryptedChunk(chunk,key){
    const vector = generateIV();
    const encrypted = await crypto.subtle.encrypt({name:"AES-GCM",vector},key,chunk);
    const combined = new Uint8Array(IV_SIZE+encrypted.byteLength);
    combined.set(vector,0);
    combined.set(encrypted,IV_SIZE);

    return combined;
}

async function decryptedChunk(encChunk,key){
    const vector = encChunk.slice(0,IV_SIZE);
    const encrypted = encChunk.slice(IV_SIZE);
    return await crypto.subtle.decrypt({name:"AES-GCM",vector},key,encrypted);

}

async function calculateCheckSum(file){
    const hasher = sha256.create();

    const stream = file.stream();
    const reader = stream.getReader();

    while(true){
        const {done,value} = await reader.read();
        if(done){
            break;
        }
        hasher.update(value);
    }

    return uint8ToHex(hasher.digest());
}

function uint8ToHex(uint8) {
  return [...uint8].map(b => b.toString(16).padStart(2, "0")).join("");
}

function generateIV(){
    return crypto.getRandomValues(new Uint8Array(IV_SIZE));
}



function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';

  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary);
}

function toUnit8Array(base64Key){
    const binaryString = atob(base64Key);
    const byteArray = new Uint8Array(text.length);
    for(let i=0;i<text.length;i++){
        byteArray[i]= binaryString.charCodeAt(i);
    }

    return byteArray;
}

export {generateEncryptionKey,exportKey,importKey,encryptedChunk,decryptedChunk,calculateCheckSum};