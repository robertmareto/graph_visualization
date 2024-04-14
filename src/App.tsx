import { useEffect } from 'react';
import Graph from "graphology";
import { cropToLargestConnectedComponent } from "graphology-components";
import forceAtlas2 from "graphology-layout-forceatlas2";
import circular from "graphology-layout/circular";
import Papa from "papaparse";
import Sigma from "sigma";
import chroma from 'chroma-js';

import './App.css';

const App = () => {
  let renderer: Sigma | null = null;

  useEffect(() => {
    const fetchData = async () => {
      const url = '/data/twitter_ondadecalor.csv';

      try {
        // Verify if the file exists
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("ERROR: file not found!");
        }
        
        // Load CSV file
        const csvData = await response.text();

        Papa.parse(csvData, {
          header: true,
          delimiter: ",",
          dynamicTyping: true,
          complete: (results) => {
            const graph = new Graph();
            
            // Builf the graph by creating it's nodes and edges
            results.data.forEach((line: any) => {
              const author = line.Username;
              const isRetweet = line.Retweets >= 1;
              const retweetedBy = isRetweet ? line['Name'] : null;

              if (retweetedBy) {
                if (!graph.hasNode(author))             graph.addNode(author, { label: author });
                if (!graph.hasNode(retweetedBy))        graph.addNode(retweetedBy, { label: retweetedBy });
                if(!graph.hasEdge(retweetedBy, author)) graph.addEdge(retweetedBy, author);
              }
            });
            
            // TESTE 
            // results.data.forEach((line: any) => {
            //   const name = line.Name;
            //   const friend = line.Friend;
            //   // console.log(`Nome: ${name}, Amigo: ${friend}`);

            //   if (!graph.hasNode(name))         graph.addNode(name, { label: name });
            //   if (!graph.hasNode(friend))       graph.addNode(friend, { label: name });
            //   if (!graph.hasEdge(name, friend)) graph.addEdge(name, friend);
            // });

            // Only keep the main connected component
            // cropToLargestConnectedComponent(graph);

            // Create a color scale with chroma.js to represent the nodes
            const scale = chroma.scale(['#91DFEB', '#A29CE6']).domain([0, 100]);
            
            // Add colors to the nodes, based it's quantity of edges 
            graph.forEachNode((node) => {
              const degree = graph.degree(node);
              const color = scale(degree).hex();
              graph.setNodeAttribute(node, 'color', color);
            });

            // Use degrees for node sizes
            const degrees = graph.nodes().map((node) => graph.degree(node));
            const minDegree = Math.min(...degrees);
            const maxDegree = Math.max(...degrees);
            const minSize = 2,
              maxSize = 15;
            graph.forEachNode((node) => {
              const degree = graph.degree(node);
              graph.setNodeAttribute(
                node,
                "size",
                minSize + ((degree - minDegree) / (maxDegree - minDegree)) * (maxSize - minSize),
              );
            });
            
            // Position nodes on a circle, then run Force Atlas 2 for a while to get proper graph layout
            circular.assign(graph);
            const settings = forceAtlas2.inferSettings(graph);
            forceAtlas2.assign(graph, { settings, iterations: 600 });

            // Hide the loader from the DOM
            const loader = document.getElementById("loader") as HTMLElement;
            if (loader) loader.style.display = "none";
            
            // Draw the final graph using sigma 
            const container = document.getElementById("sigma-container") as HTMLElement;
            if (renderer === null) renderer = new Sigma(graph, container);
          },
        });
      } catch (error) {
        console.error("ERROR: coud not access the file!", error);
      }
    };

    fetchData();
  }, []); 

  return (
    <div>
      <div id="loader">Loading...</div>
      <div id="sigma-container"></div>
    </div>
  );
};

export default App;
