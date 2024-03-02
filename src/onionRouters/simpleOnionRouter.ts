import { createRandomSymmetricKey,exportSymKey,symEncrypt,symDecrypt,importSymKey,importPubKey,rsaEncrypt, exportPubKey,importPrvKey, exportPrvKey,rsaDecrypt,generateRsaKeyPair, } from '../crypto';
import bodyParser from "body-parser";
import express from "express";
import { BASE_ONION_ROUTER_PORT,REGISTRY_PORT } from "../config";

export async function simpleOnionRouter(nodeId: number) {
    const { publicKey, privateKey } = await generateRsaKeyPair();

    const publicKeyString = await exportPubKey(publicKey);
    const privateKey_webcrypt = privateKey;

	let lastReceivedEncryptedMessage: string | null = null;
	let lastReceivedDecryptedMessage: string | null = null;
	let lastMessageDestination: number | null = null;
	
	try {
		await fetch(`http://localhost:${REGISTRY_PORT}/registerNode`, {
		method: "POST",
		headers: {
		  "Content-Type": "application/json",
		},
		body: JSON.stringify({
			'nodeId': nodeId, 'pubKey' : publicKeyString
		}),
	  });
    } catch (error) {
        console.error('Error registering node:', error);
    }

    const onionRouter = express();
    onionRouter.use(express.json());
    onionRouter.use(bodyParser.json());

    onionRouter.get("/getLastReceivedEncryptedMessage", async (req, res) => {
        res.json({ result: lastReceivedEncryptedMessage });
    });

    onionRouter.get("/getLastReceivedDecryptedMessage", async (req, res) => {
        res.json({ result: lastReceivedDecryptedMessage });
    });

    onionRouter.get("/getLastMessageDestination", async (req, res) => {
        res.json({ result: lastMessageDestination });
    });

    onionRouter.get("/status", async (req, res) => {
        res.send('live');
    });
	
	onionRouter.get("/getPrivateKey", async (req, res) => {
        res.json({ result: await exportPrvKey(privateKey_webcrypt)
		});
    });
	
	onionRouter.post('/message', async (req, res) => {
  // Extract the message from the request body
  const { message } = req.body;
	const first344Chars = message.substring(0, 344);
    const remainingChars = message.substring(344);
	lastReceivedEncryptedMessage = message;
	const sym_key = await rsaDecrypt(first344Chars,privateKey_webcrypt);
	const dechiffre = await symDecrypt(sym_key,remainingChars);
    
	const port = parseInt(dechiffre.substring(6,10));
	const messageAtransmettre = dechiffre.substring(10)
	lastMessageDestination = port;
	lastReceivedDecryptedMessage = messageAtransmettre;
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