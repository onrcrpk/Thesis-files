<?php

namespace xc\Controllers\api;

use xc\Controllers\ApiMethod;
use xc\MultiSpeciesMap;
use xc\Query;

class RegionResults extends ApiMethod
{

    public function get()
    {
        $latmax = strip_tags($this->request->query->get('yn'));
        $latmin = strip_tags($this->request->query->get('ys'));
        $lonmin = strip_tags($this->request->query->get('xw'));
        $lonmax = strip_tags($this->request->query->get('xe'));
        $filter = $this->request->query->get('query');

        $q = new Query("box:$latmin,$lonmin,$latmax,$lonmax $filter", true);
        $res = $q->execute(Query::NO_PAGING, 10000);
        $numSpecies = $q->numSpecies();
        $numRecordings = $q->numRecordings();
        $summary = [
            'species' => $numSpecies,
            'recordings' => $numRecordings,
        ];

        // this is a little bit strange.  We don't actually want to display a map, so
        // we'll pass an arbitrary map id.  We're simply using this to generate JSON for
        // markers
        $map = new MultiSpeciesMap('map-canvas', $res);
        $markers = $map->getMarkers();
        $specs = $map->getSpecs();

        return $this->respond(
            ['specs' => $specs, 'markers' => $markers, 'summary' => $summary]
        );
    }
}
