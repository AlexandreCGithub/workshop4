import bodyParser from "body-parser";
import express, { Request, Response } from "express";
import { REGISTRY_PORT } from "../config";

export type Node = { nodeId: number; pubKey: string };

export type RegisterNodeBody = {
  nodeId: number;
  pubKey: string;
};

export type GetNodeRegistryBody = {
  nodes: Node[];
};



export async function launchRegistry() {
  const _registry = express();
  _registry.use(express.json());
  _registry.use(bodyParser.json());

  _registry.get("/status", async (req, res) => {
    res.send('live');
  });
	const registeredNodes: Node[] = [];
  // Route pour enregistrer un nœud
  _registry.post("/registerNode", async (req, res) => {
    const { nodeId, pubKey } = req.body;

    // Validate request body
    if (typeof nodeId !== 'number' || typeof pubKey !== 'string') {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    // Check if the node is already registered
    const existingNode = registeredNodes.find(node => node.nodeId === nodeId);
    if (existingNode) {
      return res.status(400).json({ error: 'Node already registered' });
    }

    // Register the node
    const newNode: Node = { nodeId, pubKey };
    registeredNodes.push(newNode);

    return res.status(201).json({ message: 'Node registered successfully', node: newNode });
  });

_registry.get("/getNodeRegistry", async (req, res) => {
  const getNodeRegistryBody: GetNodeRegistryBody = {
    nodes: registeredNodes
  };
  res.status(200).json(getNodeRegistryBody);
});



  const server = _registry.listen(REGISTRY_PORT, () => {
    console.log(`registry is listening on port ${REGISTRY_PORT}`);
  });

  return server;
}