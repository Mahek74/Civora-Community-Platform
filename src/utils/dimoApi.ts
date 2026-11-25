export async function getUserDevices() {
  return [
    {
      id: "mock-device-id",
      make: "Toyota",
      model: "Prius",
      year: 2022,
    }
  ];
}

export async function getDeviceData(deviceId: string) {
  return {
    vin: "MOCK1234567890VIN",
    make: "Toyota",
    model: "Prius",
    year: 2022,
    odometer: 15420,
    fuelPercentRemaining: 0.85,
  };
}

export async function getDeviceTrips(deviceId: string) {
  return {
    trips: [
      { averageSpeed: 45 },
      { averageSpeed: 55 },
      { averageSpeed: 70 },
    ]
  };
}
