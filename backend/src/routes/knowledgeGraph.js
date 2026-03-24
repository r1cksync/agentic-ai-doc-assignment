const express = require("express");
const { getAllEntities, getAllDocuments, getEntitiesByDocId } = require("../data/store");

const router = express.Router();

// GET /api/knowledge-graph - Return nodes and edges for D3 graph
router.get("/knowledge-graph", (_req, res) => {
  const allEntities = getAllEntities();
  const documents = getAllDocuments();

  // Build nodes: unique entities + documents
  const nodeMap = new Map();
  const nodes = [];
  const edges = [];

  // Add document nodes
  for (const doc of documents) {
    const nodeId = `doc_${doc.id}`;
    nodeMap.set(nodeId, nodes.length);
    nodes.push({
      id: nodeId,
      label: doc.title,
      type: "document",
      group: "document",
      size: 20,
    });
  }

  // Add entity nodes
  for (const entity of allEntities) {
    const key = `${entity.type}_${entity.name.toLowerCase()}`;
    if (!nodeMap.has(key)) {
      nodeMap.set(key, nodes.length);
      nodes.push({
        id: key,
        label: entity.name,
        type: entity.type,
        group: entity.type,
        size: 10 + (entity.mentions || 1) * 2,
      });
    }

    // Edge from entity to its document
    const docNodeId = `doc_${entity.docId}`;
    if (nodeMap.has(docNodeId)) {
      edges.push({
        source: key,
        target: docNodeId,
        weight: entity.mentions || 1,
      });
    }
  }

  // Build co-occurrence edges between entities in the same document
  for (const doc of documents) {
    const docEntities = allEntities.filter((e) => e.docId === doc.id);
    for (let i = 0; i < docEntities.length; i++) {
      for (let j = i + 1; j < docEntities.length; j++) {
        const keyA = `${docEntities[i].type}_${docEntities[i].name.toLowerCase()}`;
        const keyB = `${docEntities[j].type}_${docEntities[j].name.toLowerCase()}`;
        if (keyA !== keyB) {
          edges.push({
            source: keyA,
            target: keyB,
            weight: 1,
            type: "cooccurrence",
          });
        }
      }
    }
  }

  res.json({ nodes, edges });
});

module.exports = router;
