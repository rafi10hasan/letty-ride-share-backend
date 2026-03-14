import config from "../config";

export const getETAFromGoogleMaps = async (
    origin: [number, number],      // driver current location
    destination: [number, number]  // dropOff location
): Promise<number> => {
    const response = await fetch(
        `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin[1]},${origin[0]}&destinations=${destination[1]},${destination[0]}&key=${config.google_maps_api_key}`
    );
    const data = await response.json();
    // seconds এ return করে
    return data.rows[0].elements[0].duration.value;
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