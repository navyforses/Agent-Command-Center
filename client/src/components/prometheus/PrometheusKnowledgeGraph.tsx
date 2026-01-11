/**
 * PROMETHEUS-MIND: Knowledge Graph Visualization
 * ==============================================
 * Interactive visualization of the PROMETHEUS knowledge network
 *
 * Council of Minds (2125):
 * "ცოდნის გრაფი არის ტვინის ვიზუალური გამოხატულება - კავშირები აქ სიცოცხლის წყაროა."
 * "The knowledge graph is the visual expression of the brain - connections here are the source of life."
 */

import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Brain,
  Search,
  Loader2,
  Network,
  Target,
  Link2,
  Lightbulb,
  Activity,
  Beaker,
  Clock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Info,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Filter,
  X,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";

// Node type configurations
const nodeTypeConfig: Record<string, { icon: typeof Brain; color: string; bgColor: string }> = {
  symptom: { icon: Activity, color: "#ef4444", bgColor: "#fef2f2" },
  treatment: { icon: Beaker, color: "#22c55e", bgColor: "#f0fdf4" },
  mechanism: { icon: Brain, color: "#3b82f6", bgColor: "#eff6ff" },
  condition: { icon: AlertTriangle, color: "#f59e0b", bgColor: "#fffbeb" },
  research: { icon: Lightbulb, color: "#8b5cf6", bgColor: "#f5f3ff" },
  observation: { icon: Target, color: "#06b6d4", bgColor: "#ecfeff" },
  hypothesis: { icon: Lightbulb, color: "#ec4899", bgColor: "#fdf2f8" },
  connection: { icon: Link2, color: "#6366f1", bgColor: "#eef2ff" },
};

// Certainty level colors
const certaintyColors: Record<string, { bg: string; text: string; border: string }> = {
  proven: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-300", border: "border-green-300" },
  validated: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300", border: "border-blue-300" },
  probable: { bg: "bg-cyan-100 dark:bg-cyan-900/30", text: "text-cyan-700 dark:text-cyan-300", border: "border-cyan-300" },
  possible: { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-300", border: "border-yellow-300" },
  hypothetical: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-300", border: "border-purple-300" },
  speculative: { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-300", border: "border-orange-300" },
  unknown: { bg: "bg-gray-100 dark:bg-gray-900/30", text: "text-gray-700 dark:text-gray-300", border: "border-gray-300" },
};

interface GraphNode {
  id: string;
  label: string;
  type: string;
  group: string;
  certainty: string;
  confidence: number;
  description?: string;
  metadata?: Record<string, unknown>;
  size: number;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  strength: number;
  width: number;
}

interface KnowledgeGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: {
    totalNodes: number;
    totalEdges: number;
    nodeTypes: string[];
    averageConfidence: number;
  };
}

interface NodeDetailsData {
  node: {
    id: number;
    label: string;
    nodeType: string;
    description?: string;
    certaintyLevel: string;
    confidence: number;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
  };
  relationships: {
    outgoing: Array<{
      id: number;
      relationshipType: string;
      strength: number;
      targetNode?: {
        id: number;
        label: string;
        nodeType: string;
      };
    }>;
    incoming: Array<{
      id: number;
      relationshipType: string;
      strength: number;
      sourceNode?: {
        id: number;
        label: string;
        nodeType: string;
      };
    }>;
  };
  relatedMemories: Array<{
    id: number;
    content: string;
    certaintyLevel: string;
    confidence: number;
    createdAt: string;
  }>;
}

interface SearchResult {
  id: number;
  type: "memory" | "knowledge_node";
  content: string;
  score: number;
  source: "pinecone" | "local";
  certaintyLevel: string;
  confidence: number;
}

// Calculate positions using force-directed layout simulation
function calculateNodePositions(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();

  if (nodes.length === 0) return positions;

  // Initialize positions in a circle
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.35;

  nodes.forEach((node, index) => {
    const angle = (2 * Math.PI * index) / nodes.length - Math.PI / 2;
    positions.set(node.id, {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    });
  });

  // Simple force simulation (10 iterations)
  const edgeMap = new Map<string, Set<string>>();
  edges.forEach((edge) => {
    if (!edgeMap.has(edge.source)) edgeMap.set(edge.source, new Set());
    if (!edgeMap.has(edge.target)) edgeMap.set(edge.target, new Set());
    edgeMap.get(edge.source)!.add(edge.target);
    edgeMap.get(edge.target)!.add(edge.source);
  });

  for (let iter = 0; iter < 10; iter++) {
    const forces = new Map<string, { fx: number; fy: number }>();
    nodes.forEach((node) => forces.set(node.id, { fx: 0, fy: 0 }));

    // Repulsion between all nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeA = nodes[i];
        const nodeB = nodes[j];
        const posA = positions.get(nodeA.id)!;
        const posB = positions.get(nodeB.id)!;

        const dx = posB.x - posA.x;
        const dy = posB.y - posA.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        const force = 500 / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        forces.get(nodeA.id)!.fx -= fx;
        forces.get(nodeA.id)!.fy -= fy;
        forces.get(nodeB.id)!.fx += fx;
        forces.get(nodeB.id)!.fy += fy;
      }
    }

    // Attraction along edges
    edges.forEach((edge) => {
      const posA = positions.get(edge.source);
      const posB = positions.get(edge.target);
      if (!posA || !posB) return;

      const dx = posB.x - posA.x;
      const dy = posB.y - posA.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      const force = dist * 0.01 * edge.strength;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      forces.get(edge.source)!.fx += fx;
      forces.get(edge.source)!.fy += fy;
      forces.get(edge.target)!.fx -= fx;
      forces.get(edge.target)!.fy -= fy;
    });

    // Apply forces with damping
    nodes.forEach((node) => {
      const pos = positions.get(node.id)!;
      const force = forces.get(node.id)!;
      pos.x += force.fx * 0.5;
      pos.y += force.fy * 0.5;

      // Keep within bounds
      pos.x = Math.max(50, Math.min(width - 50, pos.x));
      pos.y = Math.max(50, Math.min(height - 50, pos.y));
    });
  }

  return positions;
}

interface KnowledgeGraphProps {
  childId: number;
}

export function PrometheusKnowledgeGraph({ childId }: KnowledgeGraphProps) {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [zoom, setZoom] = useState(1);
  const [filterTypes, setFilterTypes] = useState<Set<string>>(new Set());
  const [showSearch, setShowSearch] = useState(false);

  // Fetch knowledge graph data
  const { data: graphData, isLoading, refetch } = useQuery<KnowledgeGraphData>({
    queryKey: ["/api/prometheus/knowledge-graph", childId],
    queryFn: async () => {
      const response = await fetch(`/api/prometheus/knowledge-graph/${childId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch knowledge graph");
      return response.json();
    },
  });

  // Fetch node details
  const { data: nodeDetails, isLoading: nodeDetailsLoading } = useQuery<NodeDetailsData>({
    queryKey: ["/api/prometheus/knowledge-graph", childId, "node", selectedNodeId],
    queryFn: async () => {
      const response = await fetch(
        `/api/prometheus/knowledge-graph/${childId}/node/${selectedNodeId}`,
        { credentials: "include" }
      );
      if (!response.ok) throw new Error("Failed to fetch node details");
      return response.json();
    },
    enabled: !!selectedNodeId,
  });

  // Semantic search mutation
  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await fetch(`/api/prometheus/vectordb/search/${childId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ query, topK: 10, minScore: 0.5 }),
      });
      if (!response.ok) throw new Error("Search failed");
      return response.json();
    },
    onSuccess: (data) => {
      setSearchResults(data);
      setIsSearching(false);
    },
    onError: () => {
      toast({ title: "Search failed", variant: "destructive" });
      setIsSearching(false);
    },
  });

  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    searchMutation.mutate(searchQuery);
  }, [searchQuery, searchMutation]);

  // Filter nodes based on selected types
  const filteredData = useMemo(() => {
    if (!graphData) return null;
    if (filterTypes.size === 0) return graphData;

    const filteredNodes = graphData.nodes.filter((n) => filterTypes.has(n.type));
    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = graphData.edges.filter(
      (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
    );

    return {
      ...graphData,
      nodes: filteredNodes,
      edges: filteredEdges,
    };
  }, [graphData, filterTypes]);

  // Calculate node positions
  const nodePositions = useMemo(() => {
    if (!filteredData) return new Map();
    return calculateNodePositions(filteredData.nodes, filteredData.edges, 600, 400);
  }, [filteredData]);

  const toggleFilter = (type: string) => {
    setFilterTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Network className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Knowledge Graph Yet</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            PROMETHEUS is building its knowledge network. Upload documents or add observations
            to start generating knowledge nodes and connections.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with stats and controls */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                PROMETHEUS Knowledge Graph
              </CardTitle>
              <CardDescription>
                Interactive visualization of {graphData.stats.totalNodes} knowledge nodes
                and {graphData.stats.totalEdges} connections
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSearch(!showSearch)}
              >
                <Search className="h-4 w-4 mr-1" />
                Search
              </Button>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span>{graphData.stats.totalNodes} Nodes</span>
            </div>
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-muted-foreground" />
              <span>{graphData.stats.totalEdges} Edges</span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span>{Math.round(graphData.stats.averageConfidence * 100)}% Avg Confidence</span>
            </div>
          </div>
        </CardHeader>

        {/* Search panel */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t"
            >
              <CardContent className="pt-4">
                <div className="flex gap-2">
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search knowledge semantically..."
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                  <Button onClick={handleSearch} disabled={isSearching}>
                    {isSearching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {searchResults.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="text-sm font-medium">Search Results</h4>
                    <ScrollArea className="h-48">
                      <div className="space-y-2">
                        {searchResults.map((result, index) => (
                          <div
                            key={`${result.type}-${result.id}-${index}`}
                            className="p-3 bg-muted/50 rounded-md hover:bg-muted cursor-pointer"
                            onClick={() => {
                              if (result.type === "knowledge_node") {
                                setSelectedNodeId(result.id.toString());
                              }
                            }}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <Badge variant="outline" className="text-xs">
                                {result.type === "memory" ? "Memory" : "Knowledge"}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {Math.round(result.score * 100)}% match
                              </span>
                            </div>
                            <p className="text-sm line-clamp-2">{result.content}</p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Type filters */}
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2">
            {graphData.stats.nodeTypes.map((type) => {
              const config = nodeTypeConfig[type] || nodeTypeConfig.observation;
              const Icon = config.icon;
              const isActive = filterTypes.size === 0 || filterTypes.has(type);
              const count = graphData.nodes.filter((n) => n.type === type).length;

              return (
                <Badge
                  key={type}
                  variant={isActive ? "default" : "outline"}
                  className={`cursor-pointer transition-colors ${
                    isActive ? "" : "opacity-50"
                  }`}
                  onClick={() => toggleFilter(type)}
                  style={{
                    backgroundColor: isActive ? config.color : undefined,
                    borderColor: config.color,
                  }}
                >
                  <Icon className="h-3 w-3 mr-1" />
                  {type} ({count})
                </Badge>
              );
            })}
            {filterTypes.size > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilterTypes(new Set())}
                className="h-6 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Graph visualization */}
      <Card>
        <CardContent className="p-0 relative">
          {/* Zoom controls */}
          <div className="absolute top-4 right-4 z-10 flex flex-col gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setZoom((z) => Math.min(2, z + 0.2))}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setZoom(1)}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>

          {/* SVG Graph */}
          <div
            className="overflow-auto"
            style={{ maxHeight: "500px" }}
          >
            <svg
              viewBox="0 0 600 400"
              className="w-full"
              style={{
                minHeight: "400px",
                transform: `scale(${zoom})`,
                transformOrigin: "center center",
              }}
            >
              {/* Edges */}
              {filteredData?.edges.map((edge) => {
                const sourcePos = nodePositions.get(edge.source);
                const targetPos = nodePositions.get(edge.target);
                if (!sourcePos || !targetPos) return null;

                return (
                  <g key={edge.id}>
                    <line
                      x1={sourcePos.x}
                      y1={sourcePos.y}
                      x2={targetPos.x}
                      y2={targetPos.y}
                      stroke="currentColor"
                      strokeOpacity={0.2}
                      strokeWidth={Math.max(1, edge.width)}
                    />
                    {/* Edge label */}
                    <text
                      x={(sourcePos.x + targetPos.x) / 2}
                      y={(sourcePos.y + targetPos.y) / 2}
                      textAnchor="middle"
                      className="text-[8px] fill-muted-foreground"
                    >
                      {edge.label}
                    </text>
                  </g>
                );
              })}

              {/* Nodes */}
              {filteredData?.nodes.map((node) => {
                const pos = nodePositions.get(node.id);
                if (!pos) return null;

                const config = nodeTypeConfig[node.type] || nodeTypeConfig.observation;
                const isSelected = selectedNodeId === node.id;
                const nodeRadius = Math.max(15, node.size / 2);

                return (
                  <motion.g
                    key={node.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="cursor-pointer"
                    onClick={() => setSelectedNodeId(isSelected ? null : node.id)}
                  >
                    {/* Node circle */}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={nodeRadius}
                      fill={config.bgColor}
                      stroke={isSelected ? "hsl(var(--primary))" : config.color}
                      strokeWidth={isSelected ? 3 : 2}
                    />
                    {/* Confidence ring */}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={nodeRadius + 3}
                      fill="none"
                      stroke={config.color}
                      strokeWidth={2}
                      strokeDasharray={`${node.confidence * 3.14 * (nodeRadius + 3) * 2 / 100} ${3.14 * (nodeRadius + 3) * 2}`}
                      strokeLinecap="round"
                      transform={`rotate(-90 ${pos.x} ${pos.y})`}
                      opacity={0.5}
                    />
                    {/* Node label */}
                    <text
                      x={pos.x}
                      y={pos.y + nodeRadius + 12}
                      textAnchor="middle"
                      className="text-[10px] fill-foreground font-medium"
                    >
                      {node.label.length > 15 ? node.label.slice(0, 15) + "..." : node.label}
                    </text>
                    {/* Certainty badge */}
                    <text
                      x={pos.x}
                      y={pos.y + 4}
                      textAnchor="middle"
                      className="text-[8px] fill-muted-foreground"
                    >
                      {Math.round(node.confidence)}%
                    </text>
                  </motion.g>
                );
              })}
            </svg>
          </div>
        </CardContent>
      </Card>

      {/* Node details dialog */}
      <Dialog open={!!selectedNodeId} onOpenChange={(open) => !open && setSelectedNodeId(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {nodeDetailsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : nodeDetails ? (
            <>
              <DialogHeader>
                <div className="flex items-start gap-3">
                  <div
                    className="p-3 rounded-lg"
                    style={{
                      backgroundColor:
                        nodeTypeConfig[nodeDetails.node.nodeType]?.bgColor || "#f3f4f6",
                    }}
                  >
                    {(() => {
                      const Icon =
                        nodeTypeConfig[nodeDetails.node.nodeType]?.icon || Brain;
                      return (
                        <Icon
                          className="h-6 w-6"
                          style={{
                            color:
                              nodeTypeConfig[nodeDetails.node.nodeType]?.color ||
                              "#6b7280",
                          }}
                        />
                      );
                    })()}
                  </div>
                  <div className="flex-1">
                    <DialogTitle className="text-xl">{nodeDetails.node.label}</DialogTitle>
                    <DialogDescription className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">{nodeDetails.node.nodeType}</Badge>
                      <Badge
                        className={`${certaintyColors[nodeDetails.node.certaintyLevel]?.bg} ${certaintyColors[nodeDetails.node.certaintyLevel]?.text}`}
                      >
                        {nodeDetails.node.certaintyLevel}
                      </Badge>
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Confidence meter */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Confidence Level</span>
                    <span className="font-semibold">
                      {Math.round(nodeDetails.node.confidence * 100)}%
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${nodeDetails.node.confidence * 100}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>

                {/* Description */}
                {nodeDetails.node.description && (
                  <div>
                    <h4 className="font-medium mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground">
                      {nodeDetails.node.description}
                    </p>
                  </div>
                )}

                {/* Relationships */}
                <div>
                  <h4 className="font-medium mb-3">Connections</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Outgoing */}
                    <div className="space-y-2">
                      <h5 className="text-sm text-muted-foreground flex items-center gap-1">
                        <ArrowRight className="h-4 w-4" />
                        Outgoing ({nodeDetails.relationships.outgoing.length})
                      </h5>
                      <ScrollArea className="h-32">
                        {nodeDetails.relationships.outgoing.map((rel) => (
                          <div
                            key={rel.id}
                            className="p-2 bg-muted/50 rounded-md mb-2 text-sm cursor-pointer hover:bg-muted"
                            onClick={() =>
                              rel.targetNode && setSelectedNodeId(rel.targetNode.id.toString())
                            }
                          >
                            <p className="font-medium">{rel.targetNode?.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {rel.relationshipType} ({Math.round(rel.strength * 100)}%)
                            </p>
                          </div>
                        ))}
                      </ScrollArea>
                    </div>

                    {/* Incoming */}
                    <div className="space-y-2">
                      <h5 className="text-sm text-muted-foreground flex items-center gap-1">
                        <ArrowLeft className="h-4 w-4" />
                        Incoming ({nodeDetails.relationships.incoming.length})
                      </h5>
                      <ScrollArea className="h-32">
                        {nodeDetails.relationships.incoming.map((rel) => (
                          <div
                            key={rel.id}
                            className="p-2 bg-muted/50 rounded-md mb-2 text-sm cursor-pointer hover:bg-muted"
                            onClick={() =>
                              rel.sourceNode && setSelectedNodeId(rel.sourceNode.id.toString())
                            }
                          >
                            <p className="font-medium">{rel.sourceNode?.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {rel.relationshipType} ({Math.round(rel.strength * 100)}%)
                            </p>
                          </div>
                        ))}
                      </ScrollArea>
                    </div>
                  </div>
                </div>

                {/* Related memories */}
                {nodeDetails.relatedMemories.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Related Memories</h4>
                    <ScrollArea className="h-40">
                      <div className="space-y-2">
                        {nodeDetails.relatedMemories.map((memory) => (
                          <div
                            key={memory.id}
                            className="p-3 bg-muted/50 rounded-md"
                          >
                            <p className="text-sm line-clamp-2">{memory.content}</p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              <Badge variant="outline" className="text-xs">
                                {memory.certaintyLevel}
                              </Badge>
                              <span>
                                {Math.round(memory.confidence * 100)}% confidence
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {/* Metadata */}
                <div className="text-xs text-muted-foreground flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Created: {new Date(nodeDetails.node.createdAt).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <RefreshCw className="h-3 w-3" />
                    Updated: {new Date(nodeDetails.node.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Info className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Node details not available</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PrometheusKnowledgeGraph;
