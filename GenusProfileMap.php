<?php

namespace xc;

class GenusProfileMap extends RecordingMap
{

    private $m_unspecMarkerSpec;

    private $m_bgMarkerSpec;


    // override the legend function

    private $m_spMarkerSpec;

    private $i;

    public function __construct($mapCanvasId, $genus, $includeBg)
    {
        // ignore $includeBg for now...
        $this->i = 0;
        $query   = new Query("gen:$genus");
        $query->setOrder('taxonomy');
        parent::__construct($mapCanvasId, $query->execute());
        $this->m_spMarkerSpec = [];
    }

    public function darkenColor($h, $s, $l, $amount = 10) {
        $l = max(0, $l - $amount); // Reduce lightness by $amount but ensure it doesn't go below 0
        return "hsl($h, $s%, $l%)";
    }
    

    public function generateColors($totalColors) {
        $predefinedColors = array(
            array('h' => 0, 's' => 100, 'l' => 50),      // red
            array('h' => 25, 's' => 100, 'l' => 35),    // Brownish-Orange
            array('h' => 30, 's' => 100, 'l' => 50),    // orange
            array('h' => 60, 's' => 100, 'l' => 50),    // yellow
            array('h' => 100, 's' => 100, 'l' => 39),   // green
            array('h' => 195, 's' => 100, 'l' => 50),   // blue
            array('h' => 240, 's' => 100, 'l' => 35)    // purple
        );
        
        $colors = array();
        
        for ($i = 0; $i < $totalColors; $i++) {
            if ($totalColors == 1) { // If there's only one color, use a predefined color
                $colors[] = $predefinedColors[0];
                continue;
            }
            $segment = ($totalColors - 1) / max(1, (count($predefinedColors) - 1));
            
            $lowerIndex = floor($i / $segment);
            $upperIndex = min($lowerIndex + 1, count($predefinedColors) - 1);
            $t = ($i - $lowerIndex * $segment) / $segment;
            
            $h = $predefinedColors[$lowerIndex]['h'] + ($predefinedColors[$upperIndex]['h'] - $predefinedColors[$lowerIndex]['h']) * $t;
            $s = $predefinedColors[$lowerIndex]['s'] + ($predefinedColors[$upperIndex]['s'] - $predefinedColors[$lowerIndex]['s']) * $t;
            $l = $predefinedColors[$lowerIndex]['l'] + ($predefinedColors[$upperIndex]['l'] - $predefinedColors[$lowerIndex]['l']) * $t;
            
            $colors[] = array('h' => round($h), 's' => round($s), 'l' => round($l));
        }
        
        return $colors;
    }
    
    
    public function getLegendVfunc_ioc() {
        $totalColors = count($this->m_spMarkerSpec);
        if ($totalColors == 0) { // If there are no species, return an empty div
            return '<div class="map-legend"></div>';
        }
    
        $colorScale = $this->generateColors($totalColors);
        
        $html = "<div class=\"map-legend\">";
        
        if ($this->m_spMarkerSpec) {
            $html .= '<ul>';
    
        $colorIndex = 0;
        foreach ($this->m_spMarkerSpec as $spec) {
            $color = $colorScale[$colorIndex % count($colorScale)];
            $hslColor = "hsl(" . $color['h'] . "," . $color['s'] . "%," . $color['l'] . "%)";
            $darkerBorderColor = $this->darkenColor($color['h'], $color['s'], $color['l']);
            
            $html .= "<li>
                    <span class=\"marker-image\">
                        <svg width=\"15px\" height=\"15px\">
                            <circle cx=\"7.5\" cy=\"7.5\" r=\"6.5\" style=\"fill:{$hslColor}; stroke:{$darkerBorderColor}; stroke-width:1.5;\"/>
                        </svg>
                    </span> 
                    <span class=\"marker-text\">{$spec->legendText}</span>
                  </li>";
                    
            $colorIndex++;
        }
    
        $html .= '</ul>';
    }
    
    $html .= '</div>';
    
    return $html;
}

    public function getLegendVfunc_defaultone()
    {
        $html = "
            <div class=\"map-legend\">";

        if ($this->m_spMarkerSpec) {
            $html .= '
                <ul>';

            foreach ($this->m_spMarkerSpec as $spec) {
                $html .= "<li><span class=\"marker-image\"><img class=\"icon\" src=\"{$spec->url}\" /></span> <span class=\"marker-text\">{$spec->legendText}</span></li>";
            }
            $html .= '</ul>';
        }

        $html .= '
            </div>';

        return $html;
    }

    
    protected function createMarkerForRecording($rec)
    {
        $marker = new Marker();
        $spec   = null;
        $sp     = $rec->speciesName();
        $spec   = new MarkerSpec();

        $marker->restricted = $rec->restrictedForUser() ? 1 : 0;

        if (array_key_exists($sp, $this->m_spMarkerSpec)) {
            $spec = $this->m_spMarkerSpec[$sp];
        } elseif (!$marker->isRestricted()) {
            $spec->url = Marker::$icons[($this->i % count(Marker::$icons))];
            $this->i++;
            $spec->legendText = "<a href=\"{$rec->speciesURL()}\">{$rec->commonName()}</a> <span class='sci-name'>{$rec->scientificName()}</span>";

            $this->m_spMarkerSpec[$sp] = $spec;
        }

        $spec->height  = 14;
        $spec->width   = 14;
        $spec->anchorX = 7;
        $spec->anchorY = 7;

        $marker->spec    = $spec;
        $marker->zIndex  = 50;
        $marker->animate = true;

        $marker->latitude  = $rec->latitude();
        $marker->longitude = $rec->longitude();
        $marker->id        = $rec->xcid();
        $marker->title     = "XC{$rec->xcid()}: {$rec->commonName()}";

        return $marker;
    }
}
