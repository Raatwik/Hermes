import argparse
import multiprocessing
import os
import random
from dataclasses import dataclass

from datasets.generate_mission import run_pipeline, FaultScheduler, parse_mission_config
from simulation.fault_manager import KNOWN_FAULTS

@dataclass
class MissionTask:
    output_dir: str
    fault_class: str
    profile: dict

def generate_random_profile() -> dict:
    current_dir = os.path.dirname(os.path.abspath(__file__))
    missions_dir = os.path.join(current_dir, "missions")
    templates = [os.path.join(missions_dir, f) for f in os.listdir(missions_dir) if f.endswith(".yaml")]
    if not templates:
        raise FileNotFoundError(f"No mission templates found in {missions_dir}")
    
    template = random.choice(templates)
    return parse_mission_config(template)

def generate_single_mission(task: MissionTask):
    max_time = task.profile["setpoints"][-1]["time"]
    scheduler = FaultScheduler(max_time, force_fault_class=task.fault_class)
    run_pipeline(profile=task.profile, output_dir=task.output_dir, scheduler=scheduler)

def main():
    parser = argparse.ArgumentParser(description="Bulk Orchestrator for Telemetry Generation")
    parser.add_argument("--out", type=str, default="data", help="Output directory")
    parser.add_argument("--num_missions", type=int, default=12, help="Number of missions to generate")
    parser.add_argument("--workers", type=int, default=multiprocessing.cpu_count(), help="Number of workers")
    
    args = parser.parse_args()
    
    all_classes = ["healthy"] + list(KNOWN_FAULTS)
    tasks = []
    
    for i in range(args.num_missions):
        fault_type = all_classes[i % len(all_classes)]
        profile = generate_random_profile()
        tasks.append(MissionTask(output_dir=args.out, fault_class=fault_type, profile=profile))
        
    random.shuffle(tasks)
    
    print(f"Starting generation of {args.num_missions} varied missions using {args.workers} workers...")
    print(f"Statistical distribution: 1/{len(all_classes)} for each of {all_classes}")
    
    with multiprocessing.Pool(args.workers) as pool:
        pool.map(generate_single_mission, tasks)
        
    print(f"Finished generating {args.num_missions} missions into {args.out}/")

if __name__ == "__main__":
    main()
