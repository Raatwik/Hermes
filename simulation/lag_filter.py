import math


class LagFilter:
    """First-order exponential lag filter for smooth transient transitions."""

    def __init__(self, initial: float, tau: float) -> None:
        self.value: float = initial
        self.tau: float = tau

    def step(self, target: float, dt: float) -> float:
        if dt <= 0.0 or self.tau <= 0.0:
            return self.value
        alpha = 1.0 - math.exp(-dt / self.tau)
        self.value += alpha * (target - self.value)
        return self.value
