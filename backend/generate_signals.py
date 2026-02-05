# This script generates 5,000 CSV files, each with 20,000 simulated signal values.
import numpy as np
import pandas as pd
import os

output_dir = 'data'
os.makedirs(output_dir, exist_ok=True)

num_signals = 2000 # User requested 2000 signals
num_samples = 10000 # User requested 10k points
# Total = 20 Million Rows

# Time range: 0 to 60 minutes (3600 seconds)
time_range = 3600

for i in range(num_signals):
    # Create time array from 0 to 3600 seconds (60 minutes)
    t = np.linspace(0, time_range, num_samples)
    
    # Generate varied signal types with different characteristics
    signal_type = i % 6  # 6 different signal patterns
    
    if signal_type == 0:
        # Slow trend with random walk
        trend = np.linspace(0, np.random.uniform(-2, 2), num_samples)
        noise = np.cumsum(np.random.normal(0, 0.05, num_samples))
        signal = trend + noise
        
    elif signal_type == 1:
        # Multiple frequency components (realistic oscillation)
        freq1 = np.random.uniform(0.001, 0.005)
        freq2 = np.random.uniform(0.01, 0.02)
        signal = (np.sin(2 * np.pi * freq1 * t) * np.random.uniform(1, 3) +
                 np.sin(2 * np.pi * freq2 * t) * np.random.uniform(0.3, 1) +
                 np.random.normal(0, 0.1, num_samples))
        
    elif signal_type == 2:
        # Step changes with noise (sensor switching states)
        signal = np.zeros(num_samples)
        num_steps = np.random.randint(3, 8)
        step_positions = sorted(np.random.choice(num_samples, num_steps, replace=False))
        current_value = np.random.uniform(-1, 1)
        prev_pos = 0
        for pos in step_positions:
            signal[prev_pos:pos] = current_value
            current_value += np.random.uniform(-1, 1)
            prev_pos = pos
        signal[prev_pos:] = current_value
        signal += np.random.normal(0, 0.05, num_samples)
        
    elif signal_type == 3:
        # Exponential decay/growth with periodic component
        decay_rate = np.random.uniform(-0.001, 0.001)
        base = np.random.uniform(0.5, 2)
        signal = base * np.exp(decay_rate * t) + np.sin(2 * np.pi * np.random.uniform(0.002, 0.01) * t) * 0.5
        signal += np.random.normal(0, 0.1, num_samples)
        
    elif signal_type == 4:
        # Burst/spike pattern
        signal = np.random.normal(0, 0.1, num_samples)
        num_bursts = np.random.randint(5, 15)
        for _ in range(num_bursts):
            burst_center = np.random.randint(0, num_samples)
            burst_width = np.random.randint(50, 200)
            burst_amplitude = np.random.uniform(1, 3)
            start = max(0, burst_center - burst_width)
            end = min(num_samples, burst_center + burst_width)
            signal[start:end] += burst_amplitude * np.exp(-((np.arange(start, end) - burst_center)**2) / (2 * (burst_width/3)**2))
    
    else:
        # Smooth polynomial trend with noise
        coeffs = np.random.uniform(-0.00001, 0.00001, 4)
        signal = (coeffs[0] * t**3 + coeffs[1] * t**2 + coeffs[2] * t + coeffs[3] * 10)
        signal += np.random.normal(0, 0.2, num_samples)
    
    # Add occasional anomalies to some signals
    if np.random.random() < 0.1:  # 10% chance
        num_anomalies = np.random.randint(1, 5)
        for _ in range(num_anomalies):
            anomaly_pos = np.random.randint(0, num_samples)
            signal[anomaly_pos] += np.random.uniform(-5, 5)
    
    df = pd.DataFrame({'time': t, 'value': signal})
    df.to_csv(os.path.join(output_dir, f'signal_{i+1:04d}.csv'), index=False)
    
    if (i + 1) % 500 == 0:
        print(f'Generated {i + 1}/{num_signals} signals...')

print('✅ All CSV files generated successfully!')
