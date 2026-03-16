import config from "../config";

export const getETAFromGoogleMaps = async (
    origin: [number, number],
    destination: [number, number]
): Promise<{ etaSeconds: number; distanceMeters: number }> => {

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin[1]},${origin[0]}&destinations=${destination[1]},${destination[0]}&key=${config.google_maps_api_key}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
        throw new Error(`Google Maps API error: ${data.status}`);
    }

    const element = data.rows[0].elements[0];

    if (element.status !== 'OK') {
        throw new Error(`Route not found: ${element.status}`);
    }

    return {
        etaSeconds: element.duration.value,       // 1486
        distanceMeters: element.distance.value,   // 9562
    };
};


/*
response:
{
   "destination_addresses" : 
   [
      "417 Milk Vita Road, Dhaka 1216, Bangladesh"
   ],
   "origin_addresses" : 
   [
      "QCV7+WP3, Dhaka 1212, Bangladesh"
   ],
   "rows" : 
   [
      {
         "elements" : 
         [
            {
               "distance" : 
               {
                  "text" : "9.6 km",
                  "value" : 9562
               },
               "duration" : 
               {
                  "text" : "25 mins",
                  "value" : 1486
               },
               "status" : "OK"
            }
         ]
      }
   ],
   "status" : "OK"
}


*/