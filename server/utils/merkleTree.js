const crypto = require('crypto');

class MerkleTree {
  constructor(leaves) {
    this.leaves = leaves.map(leaf => this.hash(leaf));
    this.tree = this.buildTree();
  }

  hash(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  buildTree() {
    if (this.leaves.length === 0) return [];
    
    let currentLevel = [...this.leaves];
    const tree = [currentLevel];

    while (currentLevel.length > 1) {
      const nextLevel = [];
      
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
        const combined = left + right;
        nextLevel.push(this.hash(combined));
      }
      
      tree.push(nextLevel);
      currentLevel = nextLevel;
    }

    return tree;
  }

  getRoot() {
    if (this.tree.length === 0) return null;
    return this.tree[this.tree.length - 1][0];
  }

  getProof(leaf) {
    const leafHash = this.hash(leaf);
    const leafIndex = this.leaves.indexOf(leafHash);
    
    if (leafIndex === -1) {
      throw new Error('Leaf not found in tree');
    }

    const proof = [];
    let currentIndex = leafIndex;

    for (let level = 0; level < this.tree.length - 1; level++) {
      const currentLevel = this.tree[level];
      const isLeft = currentIndex % 2 === 0;
      const siblingIndex = isLeft ? currentIndex + 1 : currentIndex - 1;
      
      if (siblingIndex < currentLevel.length) {
        proof.push({
          hash: currentLevel[siblingIndex],
          position: isLeft ? 'right' : 'left'
        });
      }
      
      currentIndex = Math.floor(currentIndex / 2);
    }

    return proof;
  }

  verifyProof(leaf, proof, root) {
    let currentHash = this.hash(leaf);

    for (const proofElement of proof) {
      const { hash, position } = proofElement;
      
      if (position === 'left') {
        currentHash = this.hash(hash + currentHash);
      } else {
        currentHash = this.hash(currentHash + hash);
      }
    }

    return currentHash === root;
  }

  addLeaf(leaf) {
    this.leaves.push(this.hash(leaf));
    this.tree = this.buildTree();
  }

  updateLeaf(oldLeaf, newLeaf) {
    const oldHash = this.hash(oldLeaf);
    const newHash = this.hash(newLeaf);
    const index = this.leaves.indexOf(oldHash);
    
    if (index === -1) {
      throw new Error('Leaf not found');
    }
    
    this.leaves[index] = newHash;
    this.tree = this.buildTree();
  }

  getTreeSize() {
    return this.leaves.length;
  }

  getAllLeaves() {
    return this.leaves;
  }

  // Static method to verify a vote in the tree
  static verifyVoteInTree(voteHash, proof, root) {
    const tree = new MerkleTree([]);
    return tree.verifyProof(voteHash, proof, root);
  }
}

module.exports = MerkleTree;
