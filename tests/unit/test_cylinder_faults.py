import pytest
import math
from simulation.engine import Simulation

def test_healthy_cylinders():
    sim = Simulation(throttle=0.5, altitude=0.0, noise_seed=42)
    for _ in range(500):
        sim.step(dt=0.1)
        
    state = sim.get_state()
    base_egt = state["egt"]
    
    # Check that individual EGTs track closely to the base EGT
    assert math.isclose(state["egt_1"], base_egt, abs_tol=20.0)
    assert math.isclose(state["egt_2"], base_egt, abs_tol=20.0)
    assert math.isclose(state["egt_3"], base_egt, abs_tol=20.0)
    assert math.isclose(state["egt_4"], base_egt, abs_tol=20.0)

def test_cylinder_failure_fault():
    sim = Simulation(throttle=0.8, altitude=0.0, noise_seed=42)
    
    # Baseline
    for _ in range(500):
        sim.step(dt=0.1)
    
    base_state = sim.get_state()
    base_egt = base_state["egt"]
    base_rpm = base_state["rpm"]
    
    # Inject fault on cylinder 3
    sim.inject_fault("cylinder_failure", cylinder=3, severity=1.0)
    
    for _ in range(500):
        sim.step(dt=0.1)
        
    fault_state = sim.get_state()
    
    # Global EGT shouldn't drop much
    assert math.isclose(fault_state["egt"], base_egt, abs_tol=20.0)
    
    # egt_1, egt_2, egt_4 should remain close to global EGT
    assert math.isclose(fault_state["egt_1"], fault_state["egt"], abs_tol=20.0)
    assert math.isclose(fault_state["egt_2"], fault_state["egt"], abs_tol=20.0)
    assert math.isclose(fault_state["egt_4"], fault_state["egt"], abs_tol=20.0)
    
    # egt_3 should drop dramatically (by roughly 300)
    assert fault_state["egt_3"] < fault_state["egt"] - 250.0
    
    # RPM should drop significantly (by up to 1500)
    assert fault_state["rpm"] < base_rpm - 1000.0
