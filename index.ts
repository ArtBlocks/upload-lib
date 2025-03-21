import "dotenv/config";
import { createPublicClient, createWalletClient, getContract, http, parseEventLogs } from "viem";
import fs from "fs";
import zlib from "zlib";
import util from "util";
import Graphemer from "graphemer";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

const MAX_CONTENT_SIZE = 23500;
const WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;
const BYTECODE_STORAGE_WRITER_ADDRESS = process.env.BYTECODE_STORAGE_WRITER_ADDRESS;
const RPC_URL = process.env.RPC_URL;
const ABI = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "storageContract",
        "type": "address"
      }
    ],
    "name": "StorageContractCreated",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_string",
        "type": "string"
      }
    ],
    "name": "getCompressed",
    "outputs": [
      {
        "internalType": "bytes",
        "name": "",
        "type": "bytes"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes",
        "name": "_compressedString",
        "type": "bytes"
      }
    ],
    "name": "writeCompressedStringToBytecodeStorage",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_string",
        "type": "string"
      }
    ],
    "name": "writeStringToBytecodeStorage",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const

const gzip = util.promisify(zlib.gzip);
const readFile = util.promisify(fs.readFile);

function chunk(s: string, maxBytes: number) {
  let buf = Buffer.from(s);
  const result: string[] = [];

  // Use Graphemer to split on grapheme boundaries
  const splitter = new Graphemer();

  while (buf.length) {
    const splitString = splitter.splitGraphemes(buf.toString("utf-8"));
    let i = maxBytes;

    // Assume that each chunk is composed of single-byte characters
    let chunk = splitString.slice(0, i).join("");
    let chunkSize = Buffer.byteLength(chunk);

    // If the chunk contains multi-byte characters, it will be too large
    // Reduce the chunk size until it fits
    if (chunkSize > maxBytes) {
      while (chunkSize > maxBytes) {
        i--;
        chunk = splitString.slice(0, i).join("");
        chunkSize = Buffer.byteLength(chunk);
      }
    }

    // This is a safe cut-off point; never half-way a multi-byte
    result.push(buf.subarray(0, i).toString());
    buf = buf.subarray(i); // Skip space (if any)
  }
  return result;
}

async function gzipAndBase64Encode(filePath: string) {
  try {
    // Read file
    const fileData = await readFile(filePath);

    // Gzip file
    const gzippedData = await gzip(fileData);

    // Base64 encode
    return gzippedData.toString("base64");
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

function validateEnvVars() {
  if (!WALLET_PRIVATE_KEY) {
    throw new Error("WALLET_PRIVATE_KEY is required");
  }
  if (!BYTECODE_STORAGE_WRITER_ADDRESS) {
    throw new Error("BYTECODE_STORAGE_WRITER_ADDRESS is required");
  }
  if (!RPC_URL) {
    throw new Error("RPC_URL is required");
  }
}

const main = async () => {
  validateEnvVars();
  
  const filePath = process.argv[2];
  if (!filePath) {
    throw new Error("File path is required");
  }
  
  const content = await gzipAndBase64Encode(filePath);
  if (!content) {
    throw new Error("Failed to gzip and base64 encode file");
  }
  const chunks = chunk(content, MAX_CONTENT_SIZE);
  console.log(`Generating ${chunks.length} chunks from ${filePath}...`);

  const walletClient = createWalletClient({
    account: privateKeyToAccount(WALLET_PRIVATE_KEY as `0x${string}`),
    transport: http(RPC_URL),
  });
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(RPC_URL),
  });

  const contract = getContract({
    address: BYTECODE_STORAGE_WRITER_ADDRESS as `0x${string}`,
    abi: ABI,
    client: walletClient,
  });

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (!chunk) {
      continue;
    }
    
    const tx = await contract.write.writeStringToBytecodeStorage([chunk], {
      account: walletClient.account,
      chain: walletClient.chain,
    });
    console.log(`Submitted chunk upload transaction: ${tx}`);
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: tx,
    });
    const logs = parseEventLogs({
      abi: ABI,
      logs: receipt.logs,
    });
    for (const log of logs) {
      console.log(`Chunk ${i} uploaded to ${log.args.storageContract}`);
    }
  }
};

main();

