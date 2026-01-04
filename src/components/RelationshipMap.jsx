import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { Network, ZoomIn, ZoomOut, Maximize2, Info } from 'lucide-react';
import * as d3 from 'd3';

function RelationshipMap() {
  const { relationships, news, signals, selectedRegion, setSelectedRegion } = useStore();
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [selectedNode, setSelectedNode] = useState(null);
  const [zoom, setZoom] = useState(1);

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: 500
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Draw the network graph
  useEffect(() => {
    if (!relationships || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;
    const nodes = relationships.nodes.map(n => ({ ...n }));
    const links = relationships.edges.map(e => ({ ...e }));

    // Create container group for zoom
    const g = svg.append('g');

    // Zoom behavior
    const zoomBehavior = d3.zoom()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setZoom(event.transform.k);
      });

    svg.call(zoomBehavior);

    // Color scales
    const nodeColors = {
      country: '#3b82f6',
      bloc: '#8b5cf6',
      industry: '#10b981',
      commodity: '#f59e0b'
    };

    const edgeColors = {
      alliance: '#22c55e',
      partnership: '#3b82f6',
      rivalry: '#ef4444',
      conflict: '#dc2626',
      trade: '#f59e0b',
      production: '#10b981',
      demand: '#06b6d4',
      input: '#8b5cf6',
      claim: '#f43f5e',
      support: '#22c55e',
      emerging: '#84cc16'
    };

    // Force simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links)
        .id(d => d.id)
        .distance(d => 150 - d.strength * 5))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(40));

    // Draw links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', d => edgeColors[d.type] || '#475569')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => Math.max(1, d.strength / 3));

    // Draw link labels
    const linkLabels = g.append('g')
      .selectAll('text')
      .data(links)
      .join('text')
      .attr('font-size', 8)
      .attr('fill', '#94a3b8')
      .attr('text-anchor', 'middle')
      .text(d => d.label);

    // Draw nodes
    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    // Node circles
    node.append('circle')
      .attr('r', d => 15 + d.importance * 2)
      .attr('fill', d => nodeColors[d.type] || '#475569')
      .attr('stroke', '#1e293b')
      .attr('stroke-width', 2)
      .on('click', (event, d) => {
        setSelectedNode(d);
        setSelectedRegion(d.id);
      });

    // Node labels
    node.append('text')
      .attr('dy', d => 25 + d.importance * 2)
      .attr('text-anchor', 'middle')
      .attr('font-size', 10)
      .attr('fill', '#e2e8f0')
      .text(d => d.name);

    // Simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      linkLabels
        .attr('x', d => (d.source.x + d.target.x) / 2)
        .attr('y', d => (d.source.y + d.target.y) / 2);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [relationships, dimensions]);

  // Get related news for selected node
  const getRelatedNews = (nodeId) => {
    if (!nodeId) return [];
    return news.filter(n =>
      n.regions.some(r => r.toLowerCase().includes(nodeId.toLowerCase())) ||
      n.title.toLowerCase().includes(nodeId.toLowerCase()) ||
      n.summary.toLowerCase().includes(nodeId.toLowerCase())
    ).slice(0, 5);
  };

  // Get related signals for selected node
  const getRelatedSignals = (nodeId) => {
    if (!nodeId) return [];
    return signals.filter(s =>
      s.affectedRegions.some(r => r.toLowerCase().includes(nodeId.toLowerCase())) ||
      s.affectedMarkets.some(m => m.toLowerCase().includes(nodeId.toLowerCase()))
    );
  };

  const relatedNews = selectedNode ? getRelatedNews(selectedNode.id) : [];
  const relatedSignals = selectedNode ? getRelatedSignals(selectedNode.id) : [];

  return (
    <div className="bg-intel-800 rounded-xl border border-intel-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-intel-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Network className="w-5 h-5 text-purple-400" />
          <h2 className="font-semibold text-white">Relationship & Exposure Map</h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const svg = d3.select(svgRef.current);
              svg.transition().call(
                d3.zoom().transform,
                d3.zoomIdentity.scale(zoom * 0.8)
              );
            }}
            className="p-1.5 hover:bg-intel-700 rounded transition-colors"
          >
            <ZoomOut className="w-4 h-4 text-gray-400" />
          </button>
          <span className="text-xs text-gray-500">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => {
              const svg = d3.select(svgRef.current);
              svg.transition().call(
                d3.zoom().transform,
                d3.zoomIdentity.scale(zoom * 1.2)
              );
            }}
            className="p-1.5 hover:bg-intel-700 rounded transition-colors"
          >
            <ZoomIn className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex">
        {/* Graph container */}
        <div ref={containerRef} className="flex-1 relative">
          <svg
            ref={svgRef}
            width={dimensions.width}
            height={dimensions.height}
            className="bg-intel-900"
          />

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-intel-800/90 backdrop-blur rounded-lg p-3 text-xs">
            <div className="text-gray-400 mb-2 font-medium">Node Types</div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                <span className="text-gray-300">Country</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                <span className="text-gray-300">Bloc</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                <span className="text-gray-300">Industry</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                <span className="text-gray-300">Commodity</span>
              </div>
            </div>
          </div>
        </div>

        {/* Detail panel */}
        {selectedNode && (
          <div className="w-80 border-l border-intel-700 p-4 bg-intel-800/50 max-h-[500px] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{selectedNode.name}</h3>
                <span className="text-xs text-gray-400 capitalize">{selectedNode.type}</span>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-gray-500 hover:text-white"
              >
                &times;
              </button>
            </div>

            {/* Related signals */}
            {relatedSignals.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs text-gray-500 mb-2">Active Signals</h4>
                <div className="space-y-2">
                  {relatedSignals.map(signal => (
                    <div
                      key={signal.id}
                      className={`p-2 rounded text-xs ${
                        signal.strength >= 70
                          ? 'bg-red-500/10 border border-red-500/30'
                          : signal.strength >= 50
                          ? 'bg-amber-500/10 border border-amber-500/30'
                          : 'bg-blue-500/10 border border-blue-500/30'
                      }`}
                    >
                      <div className="font-medium text-gray-200">{signal.name}</div>
                      <div className="text-gray-400 mt-1">Strength: {signal.strength}%</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Related news */}
            {relatedNews.length > 0 && (
              <div>
                <h4 className="text-xs text-gray-500 mb-2">Related News</h4>
                <div className="space-y-2">
                  {relatedNews.map(item => (
                    <div key={item.id} className="p-2 bg-intel-700/50 rounded">
                      <div className="text-xs text-gray-300 line-clamp-2">{item.title}</div>
                      <div className="text-xs text-gray-500 mt-1">{item.source}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {relatedSignals.length === 0 && relatedNews.length === 0 && (
              <div className="text-sm text-gray-500 flex items-center gap-2">
                <Info className="w-4 h-4" />
                No active signals or recent news for this node
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default RelationshipMap;
