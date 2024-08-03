// src/components/SortVisualizer.js
import React, { useState } from 'react';
import { mergeSort, quickSort, bubbleSort, selectionSort, heapSort, insertionSort } from '../algorithms';

const SortVisualizer = () => {
  const [array, setArray] = useState([]);
  const [algorithm, setAlgorithm] = useState('mergeSort');

  const handleSort = async () => {
    let sortedArray;
    switch (algorithm) {
      case 'mergeSort':
        sortedArray = mergeSort(array);
        break;
      case 'quickSort':
        sortedArray = quickSort(array);
        break;
      case 'bubbleSort':
        sortedArray = bubbleSort(array);
        break;
      case 'selectionSort':
        sortedArray = selectionSort(array);
        break;
      case 'heapSort':
        sortedArray = heapSort(array);
        break;
      case 'insertionSort':
        sortedArray = insertionSort(array);
        break;
      default:
        sortedArray = array;
        break;
    }
    setArray(sortedArray);
  };

  return (
    <div className="container">
      <h1>Sorting Algorithm Visualization</h1>
      <div className="input-container">
        <input
          type="text"
          placeholder="Array (comma separated values)"
          onChange={(e) => setArray(e.target.value.split(',').map(Number))}
        />
        <select onChange={(e) => setAlgorithm(e.target.value)} value={algorithm}>
          <option value="mergeSort">Merge Sort</option>
          <option value="quickSort">Quick Sort</option>
          <option value="bubbleSort">Bubble Sort</option>
          <option value="selectionSort">Selection Sort</option>
          <option value="heapSort">Heap Sort</option>
          <option value="insertionSort">Insertion Sort</option>
        </select>
        <button onClick={handleSort}>Sort</button>
      </div>
      <div className="array-container">
        {array.map((value, index) => (
          <div
            className="array-bar"
            key={index}
            style={{ height: `${value * 3}px` }}
          ></div>
        ))}
      </div>
    </div>
  );
};

export default SortVisualizer;
