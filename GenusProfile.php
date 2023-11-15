<?php

namespace xc\Controllers;

use xc\GenusProfileMap;
use xc\Query;
use xc\SortDirection;

use function xc\escape;
use function xc\getUrl;
use function xc\sanitize;
use function xc\XC_makeViewLinks;
use function xc\XC_pageNumber;
use function xc\XC_pageNumberNavigationWidget;
use function xc\XC_resultsTableForView;

class GenusProfile extends Controller
{

    public function handleRequest($genus)
    {
        if (!$genus) {
            return $this->notFound();
        }

        $num_per_page = defaultNumPerPage();
        $body         = $mapTable = $resultsTable = '';

        $view = escape(
            $this->request->query->get('view', defaultResultsView())
        );
        $dir  = escape(
            $this->request->query->get('dir', SortDirection::NORMAL)
        );

        $pagenumber = XC_pageNumber($this->request);
        $order      = escape($this->request->query->get('order'));

        //=================================================================================

        //========================================================================
        //
        // $number_stats
        //
        // determine number of recordings of this one species in total in collection
        //
        //=============================================================================

        $query   = "gen:$genus";
        $fgQuery = new Query($query);
        $fgQuery->setOrder($order, $dir);

        $qstart = microtime(true);

        $profileMap = new GenusProfileMap('map-canvas', $genus, true);

        //now do the results table
        $number_of_hits = $fgQuery->numRecordings();
        $num_species    = $fgQuery->numSpecies();
        $no_pages       = ceil($number_of_hits / $num_per_page);
        $start_no_shown = ($pagenumber - 1) * $num_per_page + 1;

        $restricted = $profileMap->hasRestrictedRecordings() ?
            '(' . _(
                'recordings of restricted species in this genus are not displayed on the map'
            ) . ')' : '';

        $number_stats = '
            <p>' . sprintf(
                _('%s recordings from %s species in the genus %s %s'),
                "<strong>$number_of_hits</strong>",
                "<strong>$num_species</strong>",
                "<span class='sci-name'>" . sanitize(
                    ucfirst($genus)
                ) . '</span>',
                $restricted
            ) . '
                </p>';

        $res = $fgQuery->execute($pagenumber);

        $end_no_shown = $start_no_shown + ($res->num_rows - 1);

        $links        = XC_makeViewLinks($this->request, $view);
        $resultsTable .= "
            <p>
            <div class='results-format'>" .
                         _('Results format') . ":
            $links
            </div>
            </p>
            ";

        $resultsTable .= XC_pageNumberNavigationWidget(
            $this->request,
            $no_pages,
            $pagenumber
        );
        $resultsTable .= XC_resultsTableForView($this->request, $res, $view);
        $resultsTable .= XC_pageNumberNavigationWidget(
            $this->request,
            $no_pages,
            $pagenumber
        );

        //======================================================================================
        //
        // # the google map
        //

        $map = "<div id='gnsmap'></div>

                    
        <span class='toggle-to-label'>Toggle on/off:</span>
        <button id='toggleMarkerButton'>Markers</button>
        <button id='toggleLayerButton'>Ranges</button>";


        //END OF MAP RELATED PART=============================================================


        //========================================================================
        //
        // # the songtypes
        //
        //========================================================================

        $songlist = "<div id='songTableContainer'></div>";


        //=============================================================
        //
        //    wrapping up: results table
        //
        //
        // text (includes status, recordists, nr recordings)
        //
        //=============================================================

        $taxonomy     = '';
        $escapedGenus = escape($genus);
        $sql          = "SELECT taxonomy.order, family, family_english FROM taxonomy WHERE genus='$escapedGenus'";
        $taxRes       = query_db($sql);
        $taxRow       = $taxRes->fetch_object();
        if ($taxRow) {
            $taxonomy = "
                <ul class='taxonomy order'>
                <li>" . _('Order') . ": <a href='" . getUrl(
                    'browse-taxonomy',
                    ['o' => $taxRow->order]
                ) . "'>{$taxRow->order}</a>
                <ul class='family'>
                <li>" . _('Family') . ": <a href='" . getUrl(
                            'browse-taxonomy',
                            ['f' => $taxRow->family]
                        ) . "'>{$taxRow->family}</a> ({$taxRow->family_english})
                <ul class='genus'>
                <li>" . _('Genus') . ": <span class='sci-name'>" . sanitize(
                            ucfirst($genus)
                        ) . '</span></li>
                </ul>
                </li>
                </ul>
                </li>
                </ul>';
        }


        if (count($profileMap->getMarkers()) > 0) {
            $mapTable = "
            <table id='map-table'>
                <tr>
                <td id='map-cell'>
                $map
                $songlist
                </td>
                <td>
                <div class='map-sidebar'>
                <h3>" . _('Map Legend') . "</h3>
                {$profileMap->getLegendHtml()}
                </div>
                </td>
                </tr>
            </table>";
        }

        $body .= "
            $taxonomy
            $mapTable
            $number_stats
            $resultsTable
            {$profileMap->getJS()}
            ";

        $output = '<h1>' . sprintf(
                _('Genus %s'),
                "<span class='sci-name'>" . sanitize(
                    ucfirst($genus)
                ) . '</span>'
            ) . "</h1>
            $body";

        return $this->template->render(
            $output,
            [
                'title'  => sprintf(
                    _(
                        'Genus %s'
                    ),
                    sanitize(ucfirst($genus))
                ),
                'bodyId' => 'species-profile',
            ]
        );
    }

}
