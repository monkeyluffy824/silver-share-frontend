import { BASE_URI,CHUNK_SIZE } from "./constants";
import { calculateCheckSum, encryptedChunk } from "./crypto";
const MAX_FILE_SIZE =200*1024*1024;
const MAX_TOTAL_FILES = 5;


const state ={
    files:[],
    cryptoKey:"",
    base64Key:"",
    isUploading: false,
    shortCode:""
}


async function uploadSingleFile(file,key, presignedUrl){
    const buffer = await file.arrayBuffer();
    const encryptedBody = await encryptedChunk(buffer,key);
    const response = await fetch(presignedUrl,{"method":"PUT",body:encryptedBody});
    if(!response.ok){
        throw new Error(`Failed to Upload ${file.name}`);
    }

    return [];
}

async function multipartUpload(file,key,presignedUrls) {
    const etags =[];
    const totalChunks = presignedUrls.length;
    for(let i=0;i<totalChunks;i++){
        const startByte = i* CHUNK_SIZE;
        const endByte = Math.min(startByte + CHUNK_SIZE,file.size);
        const chunk = file.slice(startByte,endByte);
        const buffer = await chunk.arrayBuffer();
        const encryptedBuffer = await encryptedChunk(buffer,key);
        const response = await fetch(presignedUrl[i],{"method":"PUT",body:encryptedBody});
        if(!response.ok){
            throw new Error(`Failed to Upload ${file.name}`);
        }

        const etag = response.headers.get('Etag');
        etags.append({'eTag' : etag, 'part_number':i+1});

    }

    return etags;
}

function fileSizeValidator(file){
    if(file.size > MAX_FILE_SIZE || file.size === 0){
        return false;
    }

    return true;
}

function createFileRequestBody(file){
    const json={};
    json["file_name"] = file.name;
    json["file_size"] = file.size;
    json["check_sum"] = calculateCheckSum(file);
    json["total_chunks"] = totalChunksFunc(file);

    return json;
}

function totalChunksFunc(file){
    return Math.round(file.size/CHUNK_SIZE);
}

function createTransferRequestBody(files,title,message,expiryCount){
    const transJson ={};
    transJson["title"] = title ? title : null;
    transJson["message"] = message ? message : null;
    const items =[];
    files?.forEach(file => {
        items.append(createFileRequestBody(file));
    });
    transJson["files"] = items;
    transJson["expiryCount"] = expiryCount;

    return transJson;
}

