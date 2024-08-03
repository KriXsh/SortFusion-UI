// src/algorithms/treeSort.js
export const treeSort = (arr) => {
  class TreeNode {
      constructor(value) {
          this.value = value;
          this.left = null;
          this.right = null;
      }
  }

  const insert = (node, value) => {
      if (!node) return new TreeNode(value);
      if (value < node.value) node.left = insert(node.left, value);
      else node.right = insert(node.right, value);
      return node;
  };

  const inOrderTraversal = (node, result = []) => {
      if (node) {
          inOrderTraversal(node.left, result);
          result.push(node.value);
          inOrderTraversal(node.right, result);
      }
      return result;
  };

  let root = null;
  arr.forEach(value => root = insert(root, value));
  return inOrderTraversal(root);
};