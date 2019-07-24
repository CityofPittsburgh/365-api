const express = require("express");
const router = express.Router();
const refreshToken = require("../refresh");
const fetch = require("node-fetch");
const dt = require("node-json-transform").DataTransform;
const models = require("../models/accMobile");

global.Headers = fetch.Headers;

router.get("/allAnimals", async (req, res) => {
  const animalCall = await fetch(
    "https://cityofpittsburgh.sharepoint.com/sites/PublicSafety/ACC/_api/web/lists/GetByTitle('Animals')/items?$top=5000",
    {
      method: "get",
      headers: new Headers({
        Authorization: "Bearer " + (await refreshToken()),
        Accept: "application/json"
      })
    }
  );
  const animalResponse = await animalCall.json();
  const formattedAnimals = await dt(animalResponse, models.animals).transform();

  const incidentCall = await fetch(
    "https://cityofpittsburgh.sharepoint.com/sites/PublicSafety/ACC/_api/web/lists/GetByTitle('Incidents')/items?$top=5000",
    {
      method: "get",
      headers: new Headers({
        Authorization: "Bearer " + (await refreshToken()),
        Accept: "application/json"
      })
    }
  );
  const incidentResponse = await incidentCall.json();
  const formattedIncidents = dt(
    incidentResponse,
    models.electronicIncidents
  ).transform();

  try {
    let newAnimals = [];
    for (const animal of formattedAnimals) {
      const incident = formattedIncidents.find(
        i => i.uuid == animal.incidentID
      );

      if (incident && incident.coords) {
        const coords = incident.coords;
        const newAnimal = {
          name: animal.animalName,
          type: animal.animalType,
          coords: formatLatLng(coords),
          reasonForVisit: incident.reasonForVisit
        };
        newAnimals.push(newAnimal);
      }
    }
    res.status(200).send(newAnimals);
  } catch (err) {
    res.status(500).send(err);
  }

  // res.status(200).send(formattedIncidents);
});

//transform the coords string into a lat/long object

function formatLatLng(coords){
  const lat = coords.substring(
    coords.lastIndexOf("(") + 1,
    coords.lastIndexOf(",")
  );
  const lng = coords.substring(
    coords.lastIndexOf(" ") + 1,
    coords.lastIndexOf(")")
  );
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);
  const lat_lng = { lat: latitude, lng: longitude };
  return lat_lng;
}

module.exports = router;
