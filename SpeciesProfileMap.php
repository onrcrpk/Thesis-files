<?php

namespace xc;

class SpeciesProfileMap extends RecordingMap
{

    private $m_unspecMarkerSpec;

    private $m_bgMarkerSpec;

    private $m_sspMarkerSpec;

    private $m_species;

    public function __construct($mapCanvasId, $speciesNumber, $fgResults, $bgResults, $kmlURL = '')
    {
        $this->m_species = Species::load($speciesNumber);
        parent::__construct($mapCanvasId);

        // first add the foreground results to the map, ordered by subspecies
        $this->addResults($fgResults);

        // now add the background results to the map.
        if ($bgResults) {
            $this->addResults($bgResults);
        }

        if ($kmlURL) {
            $this->m_kmlURL = $kmlURL;
        }

        // create default marker for unspecified ssp
        $spec = new MarkerSpec();
        $spec->url = Marker::$unspecifiedIcon;
        $spec->legendText = 'unspecified';
        $this->m_unspecMarkerSpec = $spec;
        $this->m_sspMarkerSpec = [];

        // create default marker for background ssp
        $spec = new MarkerSpec();
        $spec->url = Marker::$backgroundIcon;
        $spec->height = 12;
        $spec->width = 12;
        $spec->anchorX = 6;
        $spec->anchorY = 6;
        $spec->legendText = 'background';
        $this->m_bgMarkerSpec = $spec;
    }


    public function getLegendVfunc() {
        $html = "<div class=\"map-legend\">";
        
        // SQL query to get subspecies data ordered by subspecies sequence (ssp_seq)
        $sql = "SELECT ssp, author, ssp_seq FROM taxonomy_ssp WHERE species_nr='" . $this->m_species->speciesNumber() . "' ORDER BY ssp_seq ASC"; 
    
        $res = query_db($sql);
        $validSsp = [];
        // Populating the validSsp array with subspecies information retrieved from the database
        while ($row = $res->fetch_object()) {
            $validSsp[$row->ssp] = ['author' => $row->author, 'ssp_seq' => $row->ssp_seq];
        }
        
        // Handling cases where there are no subspecies (monotypic species)
        if (empty($validSsp)) {
            $html .= '<h4>' . _('Subspecies') . '</h4><ul>';
            // Using a red color SVG marker directly for monotypic species
            $svgMarker = $this->createSvgMarker("hsl(0, 100%, 50%)"); // red color
            $html .= "<li><span class=\"marker-image\">$svgMarker</span>";
            $html .= '<span class="marker-text">Monotypic</span></li></ul>';
        } else {
    
            $html .= '<h4>' . _('Subspecies') . '</h4><ul>';
    
            $sortedMarkerSpec = [];
            // Sorting markers based on subspecies sequence (ssp_seq)
            foreach ($this->m_sspMarkerSpec as $spec) {
                $ssp = $spec->legendText;
                if (array_key_exists($ssp, $validSsp)) {
                    $sortedMarkerSpec[$validSsp[$ssp]['ssp_seq']] = $spec;
                }
            }
    
        // Sorting the array by key, which is the ssp_seq, ensuring correct order of display
         ksort($sortedMarkerSpec);
    
            foreach ($sortedMarkerSpec as $ssp_seq => $spec) {
                $ssp = $spec->legendText;
                $queryText = urlencode("\"$ssp\"");
                $legendText = "<a href='{$this->m_species->profileURL()}?query=ssp:{$queryText}'>{$ssp}</a>";
                $legendText .= " &middot; <span class='authority'>{$validSsp[$ssp]['author']}</span>";
            
                $ssp_seq = $validSsp[$ssp]['ssp_seq'];  
                
                // Calculating color based on subspecies sequence and total number of subspecies
                $color = $this->calculateColor($ssp_seq, count($validSsp));

                // Creating SVG marker with calculated color
                $svgMarker = $this->createSvgMarker($color);
    
                $html .= "<li><span class=\"marker-image\">$svgMarker</span> 
                         <span class=\"marker-text\">$legendText</span></li>";
            }
            
            $html .= '</ul>';
        }

    // Check if the $validSsp array is not empty (subspecies found)
    if (!empty($validSsp)) {
        // Process and add unclassified markers to the HTML
        if ($this->m_bgMarkerSpec || $this->m_unspecMarkerSpec) {
            $html .= '<h4>' . _('Unclassified') . '</h4>
                <ul>';
            if ($this->m_unspecMarkerSpec) {
                $html .= "
                    <li><span class=\"marker-image\"><img class=\"icon\" src=\"{$this->m_unspecMarkerSpec->url}\" /></span> 
                    <span class=\"marker-text\">" . _('No subspecies specified') . '</span></li>';
                if ($this->m_bgMarkerSpec) {
                    $html .= "
                        <li><span class=\"marker-image\"><img class=\"icon\" src=\"{$this->m_bgMarkerSpec->url}\" /></span> 
                        <span class=\"marker-text\">" . _('In background of another recording') . '</span></li>';
                }
                $html .= '
                    </ul>';
            }
        }
    }
    
    $html .= '</div>';
    
    return $html;
}



    // Function to create SVG markers with dynamic colors
    private function createSvgMarker($color) {
        // Extract HSL values from the color string
        preg_match("/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/", $color, $matches);
    
        // If matches were found
        if ($matches) {
            // Reduce the lightness by 15%
            $lightness = max((int)$matches[3] - 15, 0);
    
            // Create a new color string with the modified lightness value
            $borderColor = "hsl($matches[1], $matches[2]%, $lightness%)";
        } else {
            // Default border color if the input color format is incorrect
            $borderColor = "hsl(0, 0%, 0%)"; // Black as a default
        }
    
        return '<svg height="15px" width="15px">
                    <circle cx="7.5" cy="7.5" r="6.5" stroke="' . $borderColor . '" stroke-width="2" fill="' . $color . '" />
                </svg>';
    }
    

    // Function to calculate color based on subspecies sequence and total number of subspecies
    function calculateColor($ssp_seq, $totalSubspecies) {
        // Ensure that $ssp_seq and $totalSubspecies are numeric
        if (!is_numeric($ssp_seq) || !is_numeric($totalSubspecies) || $totalSubspecies == 0) {
            // You can return a default color or handle this case differently
            return "hsl(0, 0%, 50%)"; // return grey color if there's an error
        }



        // Define color scale as an array of hsl values
        $colorScale = array(
            array('h' => 0, 's' => 100, 'l' => 50),      // red
            array('h' => 25, 's' => 100, 'l' => 35),    // Brownish-Orange
            array('h' => 30, 's' => 100, 'l' => 50),    // orange
            array('h' => 60, 's' => 100, 'l' => 50),    // yellow
            array('h' => 100, 's' => 100, 'l' => 39),   // green
            array('h' => 195, 's' => 100, 'l' => 50),   // blue
            array('h' => 240, 's' => 100, 'l' => 35)    // dark blue
        );
        
        // Calculation logic for determining the appropriate color based on the input
        $segment = ($totalSubspecies - 1) / max(1, (count($colorScale) - 1));
        // Ensure that $segment is numeric and non-zero
        if (!is_numeric($segment) || $segment == 0) {
            return "hsl(0, 0%, 50%)"; // return grey color if there's an error
        }
        
        $lowerIndex = floor($ssp_seq / $segment);
        $upperIndex = min($lowerIndex + 1, count($colorScale) - 1);
        $t = ($ssp_seq - $lowerIndex * $segment) / $segment;
    
        $h = $colorScale[$lowerIndex]['h'] + ($colorScale[$upperIndex]['h'] - $colorScale[$lowerIndex]['h']) * $t;
        $s = $colorScale[$lowerIndex]['s'] + ($colorScale[$upperIndex]['s'] - $colorScale[$lowerIndex]['s']) * $t;
        $l = $colorScale[$lowerIndex]['l'] + ($colorScale[$upperIndex]['l'] - $colorScale[$lowerIndex]['l']) * $t;

    return "hsl(" . round($h) . "," . round($s) . "%," . round($l) . "%)";
}
    
    

    
    

    

    public function getLegendVfunc_defaultone()
    {
        $html = "
            <div class=\"map-legend\">";

        if ($this->m_sspMarkerSpec) {
            $sql = "SELECT ssp, author FROM taxonomy_ssp WHERE species_nr='" . $this->m_species->speciesNumber() . "'";
            $res = query_db($sql);
            $validSsp = [];
            while ($row = $res->fetch_object()) {
                $validSsp[$row->ssp] = $row->author;
            }

            $html .= '
                <h4>' . _('Subspecies') . '</h4>
                <ul>';

            foreach ($this->m_sspMarkerSpec as $spec) {
                $ssp = $spec->legendText;
                $queryText = urlencode("\"$ssp\"");
                $legendText = "<a href='{$this->m_species->profileURL()}?query=ssp:{$queryText}'>{$ssp}</a>";
                if (array_key_exists($ssp, $validSsp)) {
                    $legendText .= " &middot; <span class='authority'>{$validSsp[$ssp]}</span>";
                }
                $html .= "
                    <li><span class=\"marker-image\"><img class=\"icon\" src=\"{$spec->url}\" /></span> 
                    <span class=\"marker-text\">$legendText</span></li>";
            }
            $html .= '</ul>';
        }

        if ($this->m_bgMarkerSpec || $this->m_unspecMarkerSpec) {
            $html .= '<h4>' . _('Unclassified') . '</h4>
                <ul>';
            if ($this->m_unspecMarkerSpec) {
                $html .= "
                    <li><span class=\"marker-image\"><img class=\"icon\" src=\"{$this->m_unspecMarkerSpec->url}\" /></span> 
                    <span class=\"marker-text\">" . _('No subspecies specified') . '</span></li>';
                if ($this->m_bgMarkerSpec) {
                    $html .= "
                        <li><span class=\"marker-image\"><img class=\"icon\" src=\"{$this->m_bgMarkerSpec->url}\" /></span> 
                        <span class=\"marker-text\">" . _('In background of another recording') . '</span></li>';
                }
                $html .= '
                    </ul>';
            }
        }

        $html .= '
            </div>';

        return $html;
    }


    protected function createMarkerForRecording($rec)
    {
        if ($rec->speciesNumber() == $this->m_species->speciesNumber()) {
            $marker = new Marker();
            $ssp = $rec->subspecies();
            if (!empty($ssp)) {
                $spec = $this->getMarkerForSsp($ssp);
                // markers with specified subspecies should be visible on top of
                // those without a specified subspecies
                $marker->zIndex = 50;
            } else {
                $spec = $this->m_unspecMarkerSpec;
                $marker->zIndex = 40;
            }

            $spec->height = 14;
            $spec->width = 14;
            $spec->anchorX = 7;
            $spec->anchorY = 7;

            $marker->spec = $spec;
            $marker->animate = true;
            if ($rec->isPseudoSpecies()) {
                $marker->title = "XC{$rec->xcid()}: {$rec->commonName()} ({$rec->recordist()})";
            } else {
                $marker->title = "XC{$rec->xcid()}: {$rec->fullScientificName()} ({$rec->recordist()})";
            }
        } else {
            $marker = new Marker();
            $marker->spec = $this->m_bgMarkerSpec;
            $marker->zIndex = 10;
            $marker->animate = false;
            if ($rec->isPseudoSpecies()) {
                $marker->title = "Background of XC{$rec->xcid()}: {$rec->commonName()}";
            } else {
                $marker->title = "Background of XC{$rec->xcid()}: {$rec->scientificName()}";
            }
            $marker->contentType = Marker::Background;
        }
        $marker->latitude = $rec->latitude();
        $marker->longitude = $rec->longitude();
        $marker->id = $rec->xcid();

        return $marker;
    }





    private function getMarkerForSsp($ssp)
    {
        $ssp = trim(strtolower($ssp));
        if (!array_key_exists($ssp, $this->m_sspMarkerSpec)) {
            $spec = new MarkerSpec();
            // always assign the first marker to the nominate ssp
            if ($ssp === $this->m_species->species()) {
                $spec->url = Marker::$icons[0];
            } else {
                $i = (count($this->m_sspMarkerSpec) + 1) % count(Marker::$icons);
                if ($i === 0) {
                    $i++;
                }
                $spec->url = Marker::$icons[$i];
            }
            $spec->legendText = $ssp;
            $this->m_sspMarkerSpec[$ssp] = $spec;
        } else {
            $spec = $this->m_sspMarkerSpec[$ssp];
        }

        return $spec;
    }
}
