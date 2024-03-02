import bodyParser from "body-parser";
import express from "express";
import { BASE_ONION_ROUTER_PORT,REGISTRY_PORT,BASE_USER_PORT } from "../config";
import { GetNodeRegistryBody } from "../../src/registry/registry";
import { createRandomSymmetricKey,exportSymKey,symEncrypt,symDecrypt,importSymKey,importPubKey,rsaEncrypt } from '../crypto';
import { webcrypto } from "crypto";

export type SendMessageBody = {
  message: string;
  destinationUserId: number;
};

export async function user(userId: number) {
	let LastReceivedMessage: string | null = null;
	let lastSentMessage: string | null = null;
	let lastCircuit : number[] | null = null;
  const _user = express();
  _user.use(express.json());
  _user.use(bodyParser.json());

_user.get("/getLastReceivedMessage", async (req, res) => {
	//res.send(LastReceivedMessage);
    res.json({ result: LastReceivedMessage });
  });

_user.get("/getlastSentMessage", async (req, res) => {
	//res.send(lastSentMessage);
    res.json({ result: lastSentMessage });
  });
  
_user.get("/getLastCircuit", async (req, res) => {
    res.json({ result: lastCircuit });
});


  _user.get("/status", async (req, res) => {
    res.send('live');
  });
  
  _user.post("/message", async (req, res) => {
    const { message } = req.body;
    LastReceivedMessage = message; // Update LastReceivedMessage with the received message
    res.send("success");
  });
  
_user.post("/sendMessage", async (req, res) => {
    const { message,destinationUserId } = req.body;	
        const nodes = await fetch(`http://localhost:${REGISTRY_PORT}/getNodeRegistry`)
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json() as Promise<GetNodeRegistryBody>;
            })
            .then((data) => data.nodes);
		
		const randomIndices: number[] = [];
        while (randomIndices.length < 3) {
            const randomIndex = Math.floor(Math.random() * nodes.length);
            if (!randomIndices.includes(randomIndex)) {
                randomIndices.push(randomIndex);
            }
        }

		const randomNodes = randomIndices.map(index => nodes[index]);		
		lastCircuit = randomNodes.map(u => u.nodeId);
		
		const keys: string[] = [];
		
    for (let i = 0; i < 3; i++) {
        const key = await createRandomSymmetricKey();
		const str_key = await exportSymKey(key);
        keys.push(str_key);
    }
	
	//list of addresses: destination, last node, before-last node
	const addresses_reverse: string[] = ["000000300".concat(destinationUserId.toString()), "000000".concat((4000+randomNodes[2].nodeId).toString()), "000000".concat((4000+randomNodes[1].nodeId).toString())];
	
	
	//element 0 of randomNodes is associated with element 0 of keys, etc.
		
		let text = message
		
		for (let i = 2; i >= 0; i--) {
		
		let address_and_message: string = addresses_reverse[2-i].concat(text);
		//Il faut encrypter avec la symetric key du node
		
		const sym_key_ex = await importSymKey(keys[i]);
		const senc1 = await symEncrypt(sym_key_ex,address_and_message);
		
		const senc2 = await rsaEncrypt(keys[i],randomNodes[i].pubKey);
		
		const s_total = senc2.concat(senc1);
		
		text = s_total
		
    }
	
	const mon_id = 4000 +randomNodes[0].nodeId;

		
	await fetch(`http://localhost:${mon_id}/message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
        'message': text
    }),
  });	
		lastSentMessage = message;
        res.send('success');
});


  const server = _user.listen(BASE_USER_PORT + userId, () => {
    console.log(
      `User ${userId} is listening on port ${BASE_USER_PORT + userId}`
    );
  });

  return server;
}
