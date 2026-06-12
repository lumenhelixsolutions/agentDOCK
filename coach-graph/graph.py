#!/usr/bin/env python3
"""
HOOT launch-approval LangGraph sidecar.

Usage:
  python coach-graph/graph.py --profile local-safe-audit
  HOOT_GRAPH_AUTO_APPROVE=1 python coach-graph/graph.py --profile local-safe-audit
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# Allow imports from coach-graph directory
sys.path.insert(0, str(Path(__file__).resolve().parent))

from langgraph.graph import END, StateGraph

from nodes import (
    GraphState,
    node_approve,
    node_launch,
    node_remember,
    node_scan,
    node_score,
)


def should_continue_after_score(state: GraphState) -> str:
    if state.get("error"):
        return "end"
    return "approve"


def should_continue_after_approve(state: GraphState) -> str:
    if state.get("error") or not state.get("approved"):
        return "end"
    return "launch"


def should_continue_after_launch(state: GraphState) -> str:
    if state.get("error"):
        return "end"
    return "remember"


def build_graph():
    graph = StateGraph(GraphState)
    graph.add_node("scan", node_scan)
    graph.add_node("score", node_score)
    graph.add_node("approve", node_approve)
    graph.add_node("launch", node_launch)
    graph.add_node("remember", node_remember)

    graph.set_entry_point("scan")
    graph.add_edge("scan", "score")
    graph.add_conditional_edges("score", should_continue_after_score, {"approve": "approve", "end": END})
    graph.add_conditional_edges("approve", should_continue_after_approve, {"launch": "launch", "end": END})
    graph.add_conditional_edges("launch", should_continue_after_launch, {"remember": "remember", "end": END})
    graph.add_edge("remember", END)
    return graph.compile()


def main() -> int:
    parser = argparse.ArgumentParser(description="Run HOOT launch-approval graph")
    parser.add_argument("--profile", required=True, help="Profile ID from profiles/*.md")
    parser.add_argument("--json", action="store_true", help="Print final state as JSON")
    args = parser.parse_args()

    app = build_graph()
    final = app.invoke({"profile_id": args.profile, "approved": False})

    if args.json:
        print(json.dumps(final, indent=2, default=str))
    else:
        if final.get("error"):
            print(f"Graph failed: {final['error']}")
        elif final.get("launch_result", {}).get("launched"):
            print(f"Launched {args.profile} via coach-graph")
        else:
            print("Graph completed without launch")

    return 0 if not final.get("error") else 1


if __name__ == "__main__":
    raise SystemExit(main())