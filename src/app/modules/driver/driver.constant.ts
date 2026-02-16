export const GOVERNORATE = {
  AMMAN: "Amman",
  IRBID: "Irbid",
  ZARQA: "Zarqa",
  BALQA: "Balqa",
  MADABA: "Madaba",
  JERASH: "Jerash",
  AJILOUN: "Ajiloun",
  MAFRAQ: "Mafraq",
  KARAK: "Karak",
  TAFILAH: "Tafilah",
  MAAN: "Ma'an",
  AQABA: "Aqaba",
} as const;

export const VEHICLE_TYPE = {
  CAR: "car",
  VAN: "van",
  MINI_VAN: "mini_van"

} as const;

export type TVehicleType = (typeof VEHICLE_TYPE)[keyof typeof VEHICLE_TYPE];

// Optional: Create a type from the object values
export type TGovernorate = (typeof GOVERNORATE)[keyof typeof GOVERNORATE];