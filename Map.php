<?php

namespace xc;

abstract class Map
{

    protected $m_canvasId;

    protected $m_markersText;

    protected $m_markerSpecs;

    protected $m_cluster;

    protected $m_kmlURL;

    protected $m_processed;

    protected $m_markers;

    protected $m_results;

    protected $tag;

    public function __construct($mapCanvasId, $dbResult = null, $cluster = false)
    {
        $this->m_canvasId = $mapCanvasId;
        $this->m_markerSpecs = [];
        $this->m_cluster = $cluster;
        $this->m_results = [];
        $this->m_processed = false;
        $this->m_markers = [];
        $this->tag = str_replace('.', '-', IMAGE_VERSION);

        if ($dbResult) {
            $this->addResults($dbResult);
        }
    }

    protected function addResults($dbResult)
    {
        if (!empty($dbResult)) {
            $this->m_results[] = $dbResult;
        }
    }

    public function getJS($autoInit = true)
    {
        $this->processResults();

        // and one for the markers
        $jsMarkers = $this->getMarkersJSON();
        // create a js variable that holds an array of MarkerImages
        $jsMarkerTypes = $this->getSpecsJSON();

        $clusterTF = 'false';
        if ($this->m_cluster) {
            $clusterTF = 'true';
        }

        $doinit = '';
       

        

        $headerAdditions = '


        <script src="https://unpkg.com/leaflet@1.9.3/dist/leaflet.js" integrity="sha256-WBkoXOwTeyKclOHuWtc+i2uENFpDZ9YPdf5Hf+D7ewM=" crossorigin=""></script>

        <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/leaflet.markercluster.js" integrity="sha512-OFs3W4DIZ5ZkrDhBFtsCP6JXtMEDGmhl0QPlmWYBJay40TT1n3gt2Xuw8Pf/iezgW9CdabjkNChRqozl/YADmg==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
        
        <script type="text/javascript" src="/static/js/Leaflet.fullscreen.min.js"></script>
        
        <script src="https://unpkg.com/leaflet-control-geocoder/dist/Control.Geocoder.js"></script>
        
    
        <script type="text/javascript" src="/static/js/L.switchBasemap.js"></script>
        
        <script src="https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.js"></script>

        <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js" integrity="sha512-XMVd28F1oH/O71fzwBnV7HucLxVwtxf26XV8P4wPk26EDxuGZ91N8bsOttmnomcCD3CS5ZMRL50H0GgOHvegtg==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>

        <script src="https://cdnjs.cloudflare.com/ajax/libs/chroma-js/2.4.2/chroma.min.js" integrity="sha512-zInFF17qBFVvvvFpIfeBzo7Tj7+rQxLeTJDmbxjBz5/zIr89YVbTNelNhdTT+/DCrxoVzBeUPVFJsczKbB7sew==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>


        <script type="text/javascript" src="/static/js/sspmap.js"></script>

                <script type="text/javascript" src="/static/js/browseregion.js"></script>

                <script type="text/javascript" src="/static/js/mymap-upload.js"></script>

        <script type="text/javascript" src="/static/js/gnsmap.js"></script>

        
        ';
        
        $headerAdditions .=
            <<<EOT

                
                $doinit
                </script>
                EOT;

        return $headerAdditions;
    }

    protected function processResults()
    {
        if ($this->m_processed == true) {
            return;
        }

        foreach ($this->m_results as $result) {
            if ($result->num_rows) {
                $result->data_seek(0);
            }

            $i = 0;
            while ($row = $result->fetch_object()) {
                $i++;
                $marker = $this->createMarker($row);
                if ($marker) {
                    $this->m_markers[] = $marker;
                    $specID = array_search($marker->spec, $this->m_markerSpecs, true);
                    if ($specID === false) {
                        // store a list of unique marker types so that we can use
                        // them to display a legend later on.
                        $this->m_markerSpecs[] = $marker->spec;
                        $specID = count($this->m_markerSpecs) - 1;
                    }
                    $marker->specID = $specID;
                }
                $this->m_markers[] = null;
            }
            if ($result->num_rows) {
                $result->data_seek(0);
            }
        }

        $this->m_processed = true;
    }

    abstract protected function createMarker($db_row);

    public function getMarkersJSON()
    {
        return json_encode($this->getMarkers());
    }

    public function getMarkers()
    {
        $this->processResults();

        $markers = [];
        foreach ($this->m_markers as $marker) {
            if ($marker && !$marker->isRestricted()) {
                $markers[] = $marker->asArray();
            }
        }

        return $markers;
    }

    public function getSpecsJSON()
    {
        return json_encode($this->getSpecs());
    }

    public function getSpecs()
    {
        $this->processResults();

        return $this->m_markerSpecs;
    }

    public function getLegendHtml()
    {
        // make sure that we've processed all of the database rows before
        // getting the legend so that the marker spec values are filled
        $this->processResults();

        return $this->getLegendVfunc_ioc();
    }

    protected function getLegendVfunc_ioc()
    {
        if (empty($this->m_markerSpecs)) {
            return '';
        }

        $html = '<ul>';

        foreach ($this->m_markerSpecs as $spec) {
            $html .= "<li><span class=\"marker-image\"><img class=\"icon\" src={$spec->url}/></span> <span class=\"marker-text\">{$spec->legendText}</span></li>";
        }

        $html .= '</ul>';

        return $html;
    }

    public function hasRestrictedRecordings()
    {
        $this->processResults();

        foreach ($this->m_markers as $marker) {
            if ($marker && $marker->isRestricted()) {
                return true;
            }
        }

        return false;
    }
}
