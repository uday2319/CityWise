import math
import numpy as np
from typing import Optional
from ortools.constraint_solver import pywrapcp, routing_enums_pb2
from geopy.distance import geodesic


def haversine_distance(coord1: tuple, coord2: tuple) -> float:
    """
    Calculate distance in km between two (lat, lon) pairs.
    """
    if any(v is None or (isinstance(v, float) and math.isnan(v)) for v in coord1 + coord2):
        return 5.0  # default 5km if coordinates unknown
    return geodesic(coord1, coord2).km


def build_distance_matrix(locations: list[tuple]) -> list[list[int]]:
    """
    Build integer distance matrix (meters) for OR-Tools.
    
    Args:
        locations: list of (lat, lon) tuples
    
    Returns:
        2D list of distances in meters (integers)
    """
    n = len(locations)
    matrix = [[0] * n for _ in range(n)]

    for i in range(n):
        for j in range(n):
            if i != j:
                km = haversine_distance(locations[i], locations[j])
                matrix[i][j] = int(km * 1000)  # convert to meters

    return matrix


def solve_tsp(
    locations: list[tuple],
    attraction_names: list[str],
    time_limit_seconds: int = 5,
) -> list[int]:
    """
    Solve Travelling Salesman Problem for a day's attractions.
    Returns ordered list of indices representing optimal visit sequence.
    
    Args:
        locations: (lat, lon) for each attraction
        attraction_names: names for display
        time_limit_seconds: solver time limit
    
    Returns:
        Ordered indices of visits (optimal route)
    """
    n = len(locations)

    if n <= 1:
        return list(range(n))

    if n == 2:
        return [0, 1]

    # If most locations are missing coordinates, return original order
    valid_coords = sum(
        1 for lat, lon in locations
        if lat is not None and lon is not None
        and not (math.isnan(float(lat)) if lat is not None else True)
    )
    if valid_coords < n // 2:
        print("  Most coordinates missing — skipping route optimization")
        return list(range(n))

    # Build distance matrix
    distance_matrix = build_distance_matrix(locations)

    # OR-Tools setup
    manager = pywrapcp.RoutingIndexManager(n, 1, 0)
    routing = pywrapcp.RoutingModel(manager)

    def distance_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return distance_matrix[from_node][to_node]

    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    # Search parameters
    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )
    search_parameters.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    search_parameters.time_limit.seconds = time_limit_seconds

    # Solve
    solution = routing.SolveWithParameters(search_parameters)

    if not solution:
        print("  OR-Tools: No solution found, using original order")
        return list(range(n))

    # Extract route
    route = []
    index = routing.Start(0)
    while not routing.IsEnd(index):
        node = manager.IndexToNode(index)
        route.append(node)
        index = solution.Value(routing.NextVar(index))

    total_dist_km = solution.ObjectiveValue() / 1000
    print(f"  Optimized route: {len(route)} stops, {total_dist_km:.1f}km total")

    return route


def optimize_day_route(day_attractions: list[dict]) -> list[dict]:
    """
    Optimize the visiting order for a single day's attractions.
    
    Args:
        day_attractions: list of dicts with 'name', 'latitude', 'longitude'
    
    Returns:
        Same list in optimized order
    """
    if len(day_attractions) <= 1:
        return day_attractions

    locations = [
        (float(a.get("latitude") or 0), float(a.get("longitude") or 0))
        for a in day_attractions
    ]
    names = [a.get("name", f"Stop {i}") for i, a in enumerate(day_attractions)]

    optimal_order = solve_tsp(locations, names)

    return [day_attractions[i] for i in optimal_order]