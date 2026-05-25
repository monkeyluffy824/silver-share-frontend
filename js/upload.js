import { BASE_URI,CHUNK_SIZE, FILE_TYPE_LIMIT } from "./constants";
import { calculateCheckSum, encryptedChunk, exportKey, generateEncryptionKey } from "./crypto";
const MAX_FILE_SIZE =200*1024*1024;
const MAX_TOTAL_FILES = 5;


const state ={
    files:[],
    cryptoKey:"",
    base64Key:"",
    isUploading: false,
    shortCode:"",
    title:"",
    message:"",
    expiryCount:"",
    isComplete: false,
    filePreSignedUrls:{}
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


async function mainUploadFlow(){
    if(state.files.length === 0){
        throw Error("Please Select atlest 1 file");
    }

    if(state.isUploading){
        return;
    }

    state.isUploading = true;

    try{
        
        await initiateTransfer();
        state.cryptoKey = await generateEncryptionKey();
        state.base64Key = await exportKey(state.cryptoKey);
        const filesJson ={};
        for(let i=0; i< state.files.length;i++){
            const file = state.files[i];
            const iniFileRequestBody = createFileRequestBody(file);
            const etgs =[];
            if(state.filePreSignedUrls[Object.keys()[i]].length === 1 && file.size < FILE_TYPE_LIMIT){
                etgs = await uploadSingleFile(file,state.cryptoKey,state.filePreSignedUrls[Object.keys()[i]][0]);
            }else{
                etgs = await multipartUpload(file,state.cryptoKey,state.filePreSignedUrls[Object.keys()[i]]);
            }
            completeFileBody(etgs,Object.keys()[i],filesJson);
        }
        const comJson = completeTransferBody(filesJson);
        await completeTransfer(comJson);

        state.isUploading = false;
        state.isComplete = true;
    }catch(error){
        console.log(error);
        clearoutState();
    }
}

async function initiateTransfer(){
    try{
        const transferJson = createTransferRequestBody(state.files,state.title,state.message,state.expiryCount);
        const response = await fetch(`${BASE_URI}/transfers/create`,{method: "POST", body : transferJson});
        if(response.ok){
            const transferData = await response.json();
            state.shortCode = transferData["short_code"];
            state.filePreSignedUrls = transferData["response_files"];
        }else{
            throw Error("Error ocurred in creating Transfer");
        }
    } catch (error) {
        console.log(error);
    }
}

async function completeTransfer(comJson){
    try{
        const response = await fetch(`${BASE_URI}/transfers/${state.shortCode}/complete`,{method: "POST", body : comJson});
        if(response.ok){
            return;
        }else{
            throw Error("Error Occured in completing Transfer");
        }
    }catch(error){
        console.log(error)
    }
}

function completeTransferBody(filesJson){
    const comJson ={};
    comJson["files"]= filesJson;

    return comJson
}

function completeFileBody(etgs,fileId,filesJson){
    const parts ={};
    parts["file_parts"] = etgs;
    filesJson[fileId] = parts;
}
function clearoutState(){
    state ={
                files:[],
                cryptoKey:"",
                base64Key:"",
                isUploading: false,
                shortCode:"",
                title:"",
                message:"",
                expiryCount:"",
                isComplete: false,
                filePreSignedUrls:{}
            }   
}
