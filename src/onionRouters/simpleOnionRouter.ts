import { createRandomSymmetricKey,exportSymKey,symEncrypt,symDecrypt,importSymKey,importPubKey,rsaEncrypt, exportPubKey,importPrvKey, exportPrvKey,rsaDecrypt,generateRsaKeyPair } from '../crypto';
import bodyParser from "body-parser";
import express from "express";
import { BASE_ONION_ROUTER_PORT,REGISTRY_PORT } from "../config";
import axios from 'axios';

export interface Node {
    nodeId: number | null;
    publicKey: string | null;
    privateKey: string | null;
}

export async function simpleOnionRouter(nodeId: number) {
    const { publicKey, privateKey } = await generateRsaKeyPair();

    const publicKeyString = await exportPubKey(publicKey);
    const privateKeyString = await exportPrvKey(privateKey);

	let lastReceivedEncryptedMessage: string | null = null;
	let lastReceivedDecryptedMessage: string | null = null;
	let lastMessageDestination: number | null = null;

    const node: Node = {
        nodeId,
        publicKey: publicKeyString,
        privateKey: privateKeyString
    };
	
	try {
        const registryUrl = `http://localhost:${REGISTRY_PORT}/registerNode`;
        const response = await axios.post(registryUrl, {
            nodeId,
            pubKey: publicKeyString
        });

        console.log(response.data);
    } catch (error) {
        console.error('Error registering node:', error);
    }

    const onionRouter = express();
    onionRouter.use(express.json());
    onionRouter.use(bodyParser.json());

    onionRouter.get("/getLastReceivedEncryptedMessage", (req, res) => {
        res.json({ result: lastReceivedEncryptedMessage });
    });

    onionRouter.get("/getLastReceivedDecryptedMessage", (req, res) => {
        res.json({ result: lastReceivedDecryptedMessage });
    });

    onionRouter.get("/getLastMessageDestination", (req, res) => {
        res.json({ result: lastMessageDestination });
    });

    onionRouter.get("/status", (req, res) => {
        res.send('live');
    });
	
	onionRouter.get("/getPrivateKey", (req, res) => {
        res.json({ result: privateKeyString
		
		});
    });
	
	onionRouter.post('/message', async (req, res) => {
  // Extract the message from the request body
  const { message } = req.body;
	const first344Chars = message.substring(0, 344);
    const remainingChars = message.substring(344);
	const private_key_cr = await importPrvKey(node.privateKey as string);
	const sym_key = await rsaDecrypt(first344Chars,private_key_cr);
	lastReceivedDecryptedMessage = remainingChars;
	const dechiffre = await symDecrypt(sym_key,remainingChars);
	lastReceivedDecryptedMessage = dechiffre;
	console.log('\n=====\n',dechiffre,'\n=====\n');
    
	const port = parseInt(dechiffre.substring(6,10));
	const messageAtransmettre = dechiffre.substring(10)
	
	await fetch(`http://localhost:${port}/message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
        'message': messageAtransmettre
    }),

  });
	
	res.send('success');
});



    const server = onionRouter.listen(BASE_ONION_ROUTER_PORT + nodeId, () => {
        console.log(
            `Onion router ${nodeId} is listening on port ${
                BASE_ONION_ROUTER_PORT + nodeId
            }`
        );
    });

    return server;
}