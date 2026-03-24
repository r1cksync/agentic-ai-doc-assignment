import { useEffect, useRef, useState } from "react";

export default function KnowledgeGraphViz({ data }) {
  const svgRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    if (!data?.nodes?.length || !svgRef.current) return;

    const updateDimensions = () => {
      const container = svgRef.current?.parentElement;
      if (container) {
        setDimensions({ width: container.clientWidth, height: container.clientHeight || 600 });
      }
    };
    updateDimensions();
    window.addEventListener("resize", updateDimensions);

    return () => window.removeEventListener("resize", updateDimensions);
  }, [data]);

  useEffect(() => {
    if (!data?.nodes?.length || !svgRef.current) return;

    // Import d3 dynamically only on client
    import("d3").then((d3) => {
      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();

      const { width, height } = dimensions;

      const colorScale = {
        document: "#6366F1",
        person: "#22D3EE",
        organization: "#F59E0B",
        location: "#10B981",
        date: "#EF4444",
        money: "#8B5CF6",
        technology: "#EC4899",
        legislation: "#F97316",
      };

      const simulation = d3
        .forceSimulation(data.nodes)
        .force("link", d3.forceLink(data.edges).id((d) => d.id).distance(80))
        .force("charge", d3.forceManyBody().strength(-200))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide().radius(30));

      const g = svg.append("g");

      // Zoom
      svg.call(
        d3.zoom().scaleExtent([0.3, 5]).on("zoom", (event) => {
          g.attr("transform", event.transform);
        })
      );

      // Links
      const link = g
        .append("g")
        .selectAll("line")
        .data(data.edges)
        .join("line")
        .attr("stroke", "#4A4A6A")
        .attr("stroke-opacity", 0.6)
        .attr("stroke-width", (d) => Math.min(d.weight || 1, 4));

      // Nodes
      const node = g
        .append("g")
        .selectAll("g")
        .data(data.nodes)
        .join("g")
        .call(d3.drag()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
        );

      node
        .append("circle")
        .attr("r", (d) => d.size || 8)
        .attr("fill", (d) => colorScale[d.type] || "#6366F1")
        .attr("stroke", "#1E1E2E")
        .attr("stroke-width", 2);

      node
        .append("text")
        .attr("dy", (d) => (d.size || 8) + 14)
        .attr("text-anchor", "middle")
        .attr("fill", "#9CA3AF")
        .attr("font-size", "10px")
        .text((d) => d.label?.length > 20 ? d.label.slice(0, 20) + "..." : d.label);

      // Tooltip on hover
      node.append("title").text((d) => `${d.label} (${d.type})`);

      simulation.on("tick", () => {
        link
          .attr("x1", (d) => d.source.x)
          .attr("y1", (d) => d.source.y)
          .attr("x2", (d) => d.target.x)
          .attr("y2", (d) => d.target.y);
        node.attr("transform", (d) => `translate(${d.x},${d.y})`);
      });
    });
  }, [data, dimensions]);

  if (!data?.nodes?.length) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-500">
        No entities found. Upload documents to build the knowledge graph.
      </div>
    );
  }

  // Legend
  const types = [...new Set(data.nodes.map((n) => n.type))];
  const colorScale = {
    document: "#6366F1", person: "#22D3EE", organization: "#F59E0B",
    location: "#10B981", date: "#EF4444", money: "#8B5CF6",
    technology: "#EC4899", legislation: "#F97316",
  };

  return (
    <div className="relative w-full h-full">
      <svg ref={svgRef} width={dimensions.width} height={dimensions.height} className="bg-surface rounded-xl" />
      <div className="absolute top-4 right-4 bg-card/90 border border-gray-700 rounded-lg p-3">
        <p className="text-xs font-medium text-gray-400 mb-2">Entity Types</p>
        {types.map((type) => (
          <div key={type} className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full" style={{ background: colorScale[type] || "#6366F1" }} />
            <span className="text-xs text-gray-300 capitalize">{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
