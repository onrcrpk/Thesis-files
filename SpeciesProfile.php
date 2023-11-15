<?php

namespace xc\Controllers;

use xc\Query;
use xc\Species;
use xc\SpeciesProfileMap;

use function xc\escape;
use function xc\getUrl;
use function xc\sanitize;
use function xc\XC_extinctSymbol;
use function xc\XC_formatDuration;
use function xc\XC_makeViewLinks;
use function xc\XC_pageNumber;
use function xc\XC_pageNumberNavigationWidget;
use function xc\XC_resultsTableForView;

class SpeciesProfile extends Controller
{

    public function redirectOld()
    {
        $latin = $this->request->query->get('latin');
        if ($latin) {
            $parts = explode('-', $latin);
            if (!count($parts) == 2) {
                return $this->badRequest();
            }
            $params = $this->request->query->all();
            unset($params['latin']);
            $params['genus'] = $parts[0];
            $params['species'] = $parts[1];
            return $this->movedPermanently(getUrl('species', $params));
        }

        $species_nr = $this->request->query->get('species_nr');
        if (!$species_nr) {
            return $this->notFound();
        }
        $sp = Species::load($species_nr);
        if (!$sp) {
            return $this->notFound();
        }
        $params = $this->request->query->all();
        unset($params['species_nr']);
        $params['genus'] = $sp->genus();
        $params['species'] = $sp->species();
        return $this->movedPermanently(getUrl('species', $params));
    }

    public function handleRequest($genus, $species)
    {
        $num_per_page = defaultNumPerPage();

        $output = '';

        $resultsTable = '';
        $showMap = true;
        $showMarkers = true;

        $notFound =
            '<h1>' . _('Species not found') . '</h1>
            <p>' . sprintf(
                _(
                    "The species %s does not exist in our database.  If you arrived here from an external site, this might be due to a mismatch in taxonomy.  You can try to find the species you were looking for by <a href='%s'>browsing our taxonomy</a>"
                ),
                "<span class='sci-name'>" . sanitize(
                    "$genus $species"
                ) . '</span>',
                getUrl('browse-taxonomy')
            ) . '</p>';

        $genus = escape($genus);
        $species = escape($species);
        $dir = escape($this->request->query->get('dir'));
        $order = escape($this->request->query->get('order'));

        $res = query_db("select species_nr from taxonomy where genus = '$genus' and species = '$species'");
        $row = $res->fetch_object();
        if (empty($row)) {
            return $this->notFound($notFound);
        }
        $species_nr = $row->species_nr;

        $view = $this->request->query->get('view', defaultResultsView());
        $pagenumber = XC_pageNumber($this->request);

        $sp = null;
        if ($species_nr) {
            $sp = Species::load($species_nr);
        }

        if (!$sp) {
            return $this->notFound($notFound);
        }

        // Ruud 25-06-18: map should be shown for restricted taxa only if a range map is available
        if ($sp->restricted() && !file_exists($sp->rangeMapPath())) {
            $showMap = false;
        } elseif ($sp->restricted() && file_exists($sp->rangeMapPath())) {
            $showMarkers = false;
        }

        $eng_name = $sp->commonName();
        //  $genus = strtolower($row->genus);
        //  $species= $row->species;
        $latin = $sp->scientificName();
        $speciestitle = "$eng_name ($latin)";
        $species = $sp->species();

        if ($sp->isMystery()) {
            header('Location: ' . geturl('mysteries'));
            exit();
        }

        $restricted = '';
        if ($sp->restricted()) {
            $restricted = "
                <p class='important'>
                Recordings of this species are currently restricted.
                <a href='" . getUrl('FAQ') . "#restricted'>" . _('Explain this.') . '</a>
                </p>';
        }

        $filter = $this->request->query->get('query');

        $fgMarkers = null;
        $fgQuery = new Query("sp:$species_nr $filter");
        //$fgQuery->useLocalNameSearch();
        $fgQuery->setOrder('ssp');
        if ($showMarkers) {
            $fgMarkers = $fgQuery->execute();
        }

        // Omit background species if user added a filter
        $bgMarkers = null;
        $nbg = 0;
        if ($showMarkers && empty($filter)) {
            $bgres = app()->db()->query("SELECT snd_nr from birdsounds_background WHERE species_nr='$species_nr'");
            $bgnrs = [];
            while ($row = $bgres->fetch_object()) {
                $bgnrs[] = $row->snd_nr;
            }

            if ($bgnrs) {
                // it's not necessary to exclude bg recordings for this species just
                // because the ID of the foreground species on the cut is uncertain
                $bgnrString = implode(',', $bgnrs);
                $bgQuery = new Query("nr:$bgnrString");
                $bgMarkers = $bgQuery->execute();
                $nbg = !empty($bgMarkers) ? $bgMarkers->num_rows : 0;
            }
        }

        $profileMap = new SpeciesProfileMap(
            'map-canvas',
            $species_nr,
            $fgMarkers,
            $bgMarkers,
            $sp->rangeMapURL()
        );

        $fgQuery->setOrder($order, $dir);

        //now do the results table
        $number_of_hits = $fgQuery->numRecordings();
        $no_pages = ceil($number_of_hits / $num_per_page);

        $res = $fgQuery->execute($pagenumber);

        $links = XC_makeViewLinks($this->request, $view);
        $navigation = XC_pageNumberNavigationWidget($this->request, $no_pages, $pagenumber);

        $resultsTable .= "
            <p>
            <div class='results-format'>" .
            _('Results format') . ":
            $links
            </div>
            </p>
            ";
        $resultsTable .= $navigation;
        $resultsTable .= XC_resultsTableForView($this->request, $res, $view);
        $resultsTable .= $navigation;

        $taxonomy = "
            <ul class='taxonomy order'>
            <li>" . _('Order') . ": <a href='" . getUrl('browse-taxonomy', ['ord' => $sp->order()]) . "'>{$sp->order()}</a>
            <ul class='family'>
            <li>" . _('Family') . ": <a href='" . getUrl('browse-taxonomy', ['fam' => $sp->family()]) . "'>{$sp->family()}</a> ({$sp->familyDescription()})
            <ul class='genus'>
            <li>" . _('Genus') . ": <a href='" . getUrl('browse-taxonomy', ['gen' => $sp->genus()]) . "'>{$sp->genus()}</a></li>
            <ul class='species'>
            <li>" . _('Species') . ": <span class='sci-name'>$species</span></li>
            </ul>
            </ul>
            </li>
            </ul>
            </li>
            </ul>";

        $header = $eng_name ? "$eng_name &middot; " : '';
        $header .= "<span class='sci-name'>$latin</span> &middot; <span class='authority'>{$sp->authority()}</span>";
        if ($sp->isExtinct()) {
            $header .= ' ' . XC_extinctSymbol();
        }

        if ($showMap) {
            $mapSidebar = '
                <h3>' . _('Map Legend') . "</h3>
                {$profileMap->getLegendHtml()}
                <h3>" . _('Credits') . '</h3>
                <p>' . _(
                    "Ranges shown based on <a href='http://www.birdlife.org/datazone/info/spcdownload'>BirdLife International and NatureServe (2011)</a>, now curated and maintained by Xeno-canto."
                ) . '</p>
                
                <h3>' . _('Other Resources') . "</h3>
                <ul class='simple'>
        
                <li><a href='http://avibase.bsc-eoc.org/avibase.jsp?pg=search&qstr=$latin' 
                    target='_blank'>Avibase</a></li>
                <li><a href='https://www.gbif.org/species/search?q={$sp->genus()}%20{$sp->species()}&qField=scientific'
                    target='_blank'>GBIF</a></li>
                <li><a href='http://datazone.birdlife.org/quicksearch?qs={$sp->genus()}+{$sp->species()}' 
                    target='_blank'>Birdlife datazone</a></li>
                <li><a href='http://avocet.zoology.msu.edu/recordings?scientific_name_search={$sp->genus()}+{$sp->species()}'
                    target='_blank'>AVoCet</a></li>
                <li><a href='http://en.wikipedia.org/wiki/{$sp->genus()}_{$sp->species()}'
                    target='_blank'>Wikipedia</a></li>
                 ";

            $wiki = app()->db()->query(
                "SELECT url from wikidata WHERE xcid='{$sp->genus()}-{$sp->species()}'"
            )->fetch_object();
            if (isset($wiki->url)) {
                $mapSidebar .= "<li><a href='{$wiki->url}' target='_blank'>Wikidata</a></li>";
            }

            $mapSidebar .= '</ul><p><strong>' . _('Note') . '</strong>: ' . _(
                    'Xeno-canto follows the IOC taxonomy. External sites may use a different taxonomy.'
                ) . '</p>';

            $mapRangeLegend = "
            <div class='range-legend'>
            <h4>" . _('Seasonal occurrence') . "</h4>
            <ul>
            <li><img src='/static/img/markers/range-resident.png' class='icon' /> " . _(
                    'Resident'
                ) . "</li>
            <li><img src='/static/img/markers/range-breeding.png' class='icon' /> " . _(
                    'Breeding'
                ) . "</li>
            <li><img src='/static/img/markers/range-nonbreeding.png' class='icon' /> " . _(
                    'Non-breeding'
                ) . "</li>
            <li><img src='/static/img/markers/range-migration.png' class='icon' /> " . _(
                    'Passage'
                ) . "</li>
            <li><img src='/static/img/markers/range-other.png' class='icon' /> " . _(
                    'Uncertain'
                ) . '</li>
            </ul>
            </div>
            ';
        }

        $bglink = $nbg;
        $bgqueryparam = "also:\"{$latin}\"";
        if ($filter) {
            $bgqueryparam .= " $filter";
        }
        // No link for restricted species
        if ($bglink > 0 && !$sp->restricted()) {
            $bglink = "<a href='" . getUrl('browse', ['all' => 1, 'query' => $bgqueryparam]) . "'>{$nbg}</a>";
        }

        $duration = XC_formatDuration($fgQuery->duration());
        $resultsSummary = '
            <p>' . sprintf(
                _('%s foreground recordings and %s background recordings of %s'),
                "<strong>{$fgQuery->numRecordings()}</strong>",
                $bglink,
                "<span class='sci-name'>$latin</span> <b>" . htmlentities($filter ?? '') . '</b>'
            ) . '. ' .
            sprintf(_('Total recording duration %s'), $duration) . '.
                </p>';

        $output .= "
            <h1>$header</h1>
            $taxonomy
            $restricted";

        if ($showMap) {
            $output .=
                "<table id='map-table'>


                <tr>
                <td id='map-cell'>

                

                <div id='sspmap'></div>

            
            <span class='toggle-to-label'>Toggle on/off:</span>
            <button id='toggleMarkerButton'>Markers</button>
            <button id='toggleLayerButton'>Ranges</button>
            
            
                                <span class='zoom-to-label'>Zoom to:</span>
                                <button id='zoom-to-marker'>Markers</button>
                                <button id='zoom-to-range'>Ranges</button>
                </td>
                <td>
                <div class='map-sidebar'>
                $mapSidebar
                </div>
                </td>
                </tr>
                
                <tr>
                <td>
                $mapRangeLegend
                </td>
                </tr>
                <tr>
                <td>
                
                <form id='filter-form' action='{$sp->profileURL()}' method='get'>
                <table>
                <tr>
                <td>
                <input type='text' placeholder='" . htmlspecialchars(
                    _('Filter results'),
                    ENT_QUOTES
                ) . "...' name='query' value='" . htmlspecialchars($filter, ENT_QUOTES) . "' />
                </td>
                <td>
                <input type='submit' value='" . htmlspecialchars(_('Filter results'), ENT_QUOTES) . "' />
                </td>
                </tr>
                </table>
                </form>
                </td>
                </tr>
                </table>";
        }

        $output .= "
            $resultsSummary
            $resultsTable";

        $output .= $profileMap->getJS();

        return $this->template->render(
            $output,
            ['title' => $speciestitle, 'bodyId' => 'species-profile']
        );
    }

}
