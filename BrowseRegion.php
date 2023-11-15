<?php

namespace xc\Controllers;

use xc\MultiSpeciesMap;

use function xc\getUrl;

class BrowseRegion extends Controller
{

    public function handleRequest()
    {
        $title = _('Browse by Region');
        $filterPlaceholderText = htmlspecialchars(
                                     _('Filter results'),
                                     ENT_QUOTES
                                 ) . '...';
        $map = new MultiSpeciesMap('map-canvas', null);
        $output = "<h1>$title</h1>
            </p>
            <p>" . _(
                'Choose a region of your interest by dragging a box over the map.'
            ) . '
            <strong>' . _(
                      "To drag a box, hold down '<em>Shift</em>' while dragging your mouse."
                  ) . "</strong></p>
            


            <div id='browseregion'></div>


            <form id='filter-form' method='get'>
            <table>
            <tr>
            <td>
            <input id='filter-text' type='text' placeholder='$filterPlaceholderText' name='query' />
            </td>
            <td>
            <input type='submit' value='" . htmlspecialchars(
                      _('Filter results'),
                      ENT_QUOTES
                  ) . "' />
            </td>
            </tr>
            </table>
            </form>
            <span id='region-results2'></span>
                
        

    
            {$map->getJS(false)}
    <script type='text/javascript' src='/static/js/keydragzoom.min.js'></script>
    <script type='text/javascript' src='/static/js/updateRegionResults.js'></script>

<script type='text/javascript'>         


    var lastRegion = null;
    var xcmap = null;

    function queryBounds(bnds, query) {
        // don't submit the placeholder text (workaround for IE)
        if (query == '$filterPlaceholderText')
            query = '';
        jQuery('#region-results').html('<p>Querying database...</p>');
        jQuery.get('" . getUrl('api-region-results') . "', {
        'yn': bnds.getNorthEast().lat(),
        'xe': bnds.getNorthEast().lng(),
        'ys': bnds.getSouthWest().lat(),
        'xw': bnds.getSouthWest().lng(),
        'query': query},
        function(data) {
            var url = '" . getUrl('browse') . "?query=' + encodeURIComponent('box:' + bnds.toUrlValue(3) + ' ' + jQuery('#filter-text').val());
            var noteMore = '';
            if (data.summary.recordings > data.markers.length)
                noteMore = '(only the first ' + data.markers.length + ' recordings are shown on the map)';
            jQuery('#region-results').html('<p><a href=\"' + url + '\">' + (data.summary.recordings) + ' Recordings from ' + (data.summary.species) + ' species</a> ' + noteMore + ' found in the selected region</p>');
            xcmap.setMarkers(data.markers, data.specs);
            jQuery('#filter-form input').removeAttr('disabled');

        }, 'json');
    }

    jQuery(document).ready(function() {
        xcmap = xc.initMap();

});
</script>";

        return $this->template->render(
            $output,
            ['title' => $title, 'bodyId' => 'browse-region']
        );
    }

}
