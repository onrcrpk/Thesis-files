<?php

namespace xc;

function messageDescription($type)
{
    switch ($type) {
        case 'success':
            return _('Success');
        case 'error':
            return _('Error');
        case 'warning':
            return _('Warning');
        default:
            return _('Info');
    }
}


class BaseTemplate extends Template
{

    protected $cssIncludes;

    protected $request;

    protected $headerData;

    protected $tag;

    public function __construct($request)
    {
        $this->request = $request;
        $this->tag = str_replace('.', '-', IMAGE_VERSION);
        $this->cssIncludes = [
            
            '/static/js/jquery.fancybox.css',
            '/static/js/jquery.qtip.min.css',
            '/static/js/jplayer/xcplayer.css',
            '/static/css/xeno-canto.css',
            '//fonts.googleapis.com/css?family=Ubuntu:400,700|Ubuntu+Condensed',
            '/static/css/leaflet.css',
            '/static/css/MarkerCluster.Default.css',
            '/static/css/L.switchBasemap.css',
            '/static/css/leaflet.fullscreen.css',
            '/static/css/browseregion.css',
            '/static/css/leaflet.draw.css',
            '/static/css/Control.Geocoder.css',
            '/static/css/leaflet-tag-filter-button.css',
        ];
    }

    public function render($content, $params = [])
    {
        if (array_key_exists('title', $params)) {
            $title = $params['title'] . ' :: xeno-canto';
        } else {
            $title = 'xeno-canto :: ' . _('Sharing wildlife sounds from around the world');
        }

        $bodyId = '';
        if (array_key_exists('bodyId', $params)) {
            $bodyId = $params['bodyId'];
        }

        $headerId = strtolower(ENVIRONMENT) == 'prod' ? '' : 'debug';

        $cssIncludes = '';
        foreach ($this->cssIncludes as $include) {
            if ($this->tag && substr($include, -4) == '.css') {
                $include .= '?' . $this->tag;
            }
            $cssIncludes .= "<link rel='stylesheet' href='$include' type='text/css'>\n";
        }

        $masqueradeStyle = '';
        if (User::current()) {
            $masquerade = User::current()->isMasquerade();
            if ($masquerade) {
                $masqueradeStyle = "<style type='text/css'>body {background-color: #F0E68C !important;}</style>";
            }
        }

        $html = "
            <!doctype html>
            <html>
            <head>
            <title>$title</title>

            <meta charset='utf-8'>
            ";

        if (strtolower(ENVIRONMENT) == 'prod') {
            $html .= "<meta name='robots' content='index,follow'>";
        } else {
            $html .= "<meta name='robots' content='noindex,nofollow'>";
        }

        $html .= "
            <meta name='keywords' content='bird songs, bird sounds, grasshopper sounds, wildlife sounds, birds, grasshoppers, bird sound recordings, bird song recordings, bird song archive, bird sound archive, grasshopper sounds, xeno-canto'>

            <link rel='icon' type='image/png' href='/static/img/favicon.png'>
            <link rel='apple-touch-icon' type='image/png' href='/static/img/favicon-60.png'>
            <link rel='apple-touch-icon' type='image/png' href='/static/img/favicon-76.png' sizes='76x76'>
            <link rel='apple-touch-icon' type='image/png' href='/static/img/favicon-120.png' sizes='120x120'>
            <link rel='apple-touch-icon' type='image/png' href='/static/img/favicon-152.png' sizes='152x152'>

            $cssIncludes";

        $gtmq = GOOGLE_TAG_MANAGER_TRACKING_ID;
        if ($gtmq) {
            $html .= "
                <script async src=\"https://www.googletagmanager.com/gtag/js?id=$gtmq\"></script>
                <script>
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){dataLayer.push(arguments);}
                    gtag('js', new Date());
                    gtag('config', '$gtmq');
                </script>";
        }

        $html .= "
            <!-- this needs to be in the header -->
            <!-- <script type='text/javascript' src='//ajax.googleapis.com/ajax/libs/jquery/1.6/jquery.min.js'></script> -->
            <script src=\"https://code.jquery.com/jquery-1.12.4.min.js\"></script>
            <script src=\"https://code.jquery.com/jquery-migrate-1.4.1.min.js \"></script>
        
            <!--[if lt IE 9]>
            <script>
                document.createElement('header');
                document.createElement('nav');
                document.createElement('section');
                document.createElement('article');
                document.createElement('aside');
                document.createElement('footer');
                document.createElement('hgroup');
                document.createElement('figure');
                document.createElement('figcaption');
            </script>
            <![endif]-->
        
            $masqueradeStyle
                {$this->headerData}
            </head>
            <body id='$bodyId'>";

        if ($gtmq) {
            $html .= "
                <!-- Google Tag Manager (noscript) -->
                <noscript>
                    <iframe src=\"https://www.googletagmanager.com/ns.html?id=$gtmq\" height=\"0\" width=\"0\" style=\"display: none; visibility: hidden;\"></iframe>
                </noscript>
                <!-- End Google Tag Manager (noscript) -->";
        }

        # Top banner to show branch info
        if (strtolower(ENVIRONMENT) != 'prod' && $this->tag) {
            $branch = !is_numeric(
                $this->tag
            ) ? $this->tag : 'develop (pipeline id: ' . $this->tag . ')';
            $html .= "
                 <div id='branch'>
                     <p>Current branch: $branch</p>
                 </div >";
        }

        $html .= "
            <header class='$headerId'>
            <div id='banner'>
            <hgroup id='logo'>
            <h1><a href='" . getUrl('index') . "'>xeno-canto</a></h1>
            <h2>" . _('Sharing wildlife sounds from around the world') . "</h2>
            </hgroup>
        <script type='text/javascript'>
        function showSpeciesNr(value, data)
        {
            jQuery('#species_nr').val(data.species_nr);
            jQuery('#quick-search-bar > form').submit();
        }
        </script>
        <div id='quick-search-bar'>
            <form action='" . getUrl('browse-post') . "' class='species-completion' method='post' autocomplete='off'>
                <input type='hidden' id='species_nr' name='species_nr' value='" . sanitize(
                $this->request->query->get('species_nr')
            ) . "'/>
                <div class='search-box'>
                  <input id='quick-search-input' class='species-input' data-onselect='showSpeciesNr' type='text' name='query' value='" . sanitize(
                $this->request->query->get('query')
            ) . "' placeholder='" . sanitize(
                _(
                    'Search recordings...'
                )
            ) . "' />
            <input type='submit' value='" . _('Search') . "'/>
        </div>
          </form>
          <div class='search-help'>
          <ul class='simple'>
          <li>
          <a href='" . getUrl('search') . "'>" . _('Advanced Search') . "</a>
          </li>
          <li>
          <a
          href='" . getUrl('tips') . "'
            class='tooltip'
            data-qtip-header='" . _('Quick Search Reference') . "'
            data-qtip-content='" .
            sanitize(
                "<table class='key-value'>
            <tr><td>grp:</td><td>" . _('Group') . '</td></tr>
            <tr><td>gen:</td><td>' . _('Genus') . '</td></tr>
            <tr><td>ssp:</td><td>' . _('Subspecies') . '</td></tr>
            <tr><td>rec:</td><td>' . _('Recordist') . '</td></tr>
            <tr><td>cnt:</td><td>' . _('Country') . '</td></tr>
            <tr><td>loc:</td><td>' . _('Location') . '</td></tr>
            <tr><td>rmk:</td><td>' . _('Recordist remarks') . '</td></tr>
            <tr><td>seen:</td><td>' . _('Animals seen') . '</td></tr>
            <tr><td>playback:</td><td>' . _('Playback used') . '</td></tr>
            <tr><td>also:</td><td>' . _('Background species') . '</td></tr>
            <tr><td>type:</td><td>' . _('Predefined sound type') . '</td></tr>
            <tr><td>sex:</td><td>' . _('Sex') . '</td></tr>
            <tr><td>stage:</td><td>' . _('Life stage') . '</td></tr>
            <tr><td>method:</td><td>' . _('Recording method') . '</td></tr>
            <tr><td>nr:</td><td>' . _('XC number') . '</td></tr>
            <tr><td>lic:</td><td>' . _('Recording license') . '</td></tr>
            <tr><td>q:</td><td>' . _('Recording quality') . '</td></tr>
            <tr><td>len:</td><td>' . _('Recording length (in s)') . "</td></tr>
            <tr><td colspan='2' style='padding-top: 8px;'><a href='" . getUrl('tips') . "'>" .
                _('All options explained...') . '</a></td></tr>
            </table>'
            ) . "'>" . _('Tips') . "</a>
          </li>
          </div>
        </div>
      </div>
      <nav id='main-menu'>
      <table>
      <tr>
      <td>
      <ul class='sf-menu'>
        <li>" . _('About') . "<img class='icon' height='14' width='14' src='/static/img/down.png'/>
        <ul>
        <li><a href='" . getUrl('about') . "'>" . _('About xeno-canto') . "</a></li>
        <li><a href='" . getUrl('collection-details') . "'>" . _('Collection Details') . "</a></li>
        <li><a href='" . getUrl('about-api') . "'>" . _('API') . "</a></li>
        <li><a href='" . getUrl('meetmembers') . "'>" . _('Meet the Members') . "</a></li>
        <li><a href='" . getUrl('FAQ') . "'>" . _('Frequently Asked Questions') . "</a></li>
        <li><a href='" . getUrl('termsofuse') . "'>" . _('Terms of Use') . "</a></li>
        <li><a href='" . getUrl('credits') . "'>" . _('Credits & Colofon') . '</a></li> 
        </ul>
        </li>
        <li>' . _('Explore') . "<img class='icon' height='14' width='14' src='/static/img/down.png'/>
        <ul>
          <li><a href='" . getUrl('browse-region') . "'>" . _('By Region') . "
          <li><a href='" . getUrl('browse-taxonomy') . "'>" . _('By Taxonomy') . "</a></li>
          <li><a href='" . getUrl('browse', ['query' => 'since:31', 'dir' => SortDirection::NORMAL, 'order' => 'xc']
            ) . "'>" . _('Recent Recordings') . "</a></li>
          <li><a href='" . getUrl('random') . "'>" . _('Random Recordings') . "</a></li>
         </ul>
        </li>
        <li><a href='" . getUrl('upload') . "'>" . _('Upload Sounds') . "</a></li>
        <li><a href='" . getUrl('forum') . "'>" . _('Forum') . "</a></li>
        <li><a href='" . getUrl('mysteries') . "'>" . _('Mysteries') . "</a></li>
        <li><a href='" . getUrl('features') . "'>" . _('Articles') . "</a></li>
        </ul>
        </td>
        <td style='white-space: nowrap; text-align: right'>";
        if (User::current()) {
            $name = User::current()->userName();
            if (strlen($name) > 30) {
                $name = substr($name, 0, 28) . '&hellip;';
            }

            $html .= "
            <ul class='sf-menu right'>
            <li>" . sprintf(_('Logged in as %s'), "$name") . "<img class='icon' width='14' height='14' src='/static/img/down.png'/>
            <ul>
            <li>
            <a href='" . getUrl('mypage') . "'>" . _('Your Account') . "</a>
            </li>
            <li>
            <a href='" . getUrl(
                    'recordist',
                    ['id' => User::current()->userId()]
                ) . "'>" . _(
                    'Public Profile'
                ) . '</a>
            </li>';
            if (User::current()->isAdmin()) {
                $html .= "<li><a href='" . getUrl(
                        'admin-index'
                    ) . "'>Admin Tools<img class='icon' src='/static/img/admin-16.png' title='xeno-canto administrator'/></a></li>";
            }
            $html .= "
            <li>
            <a href='" . getUrl('logout') . "'>" . _('Logout') . '</a>
            </li>
            </ul>
            </li>
            </ul>';
        } else {
            $html .= "
            <ul class='sf-menu right'>
            <li>
            <a href='" . getUrl('login') . "'>" . _('Log in / Register') . '</a>
            </li>
            </ul>';
        }

        $html .= '
        </td>
        </tr>
        </table>
        </nav>
        </header>';

        // format and display all 'flash' messages
        // group messages with the same type together
        $flashMessages = '';
        $msgTypes = app()->session()->getFlashBag()->keys();
        if ($msgTypes) {
            $flashMessages .= "<div class='popup'>";
            foreach ($msgTypes as $type) {
                $group = app()->session()->getFlashBag()->get($type);
                $flashMessages .= "<div class='flash $type'>
                <div class='content'>
                <ul class='simple'>";
                foreach ($group as $message) {
                    $flashMessages .= "<li>$message</li>";
                }
                $flashMessages .= '</ul>
                </div>
                </div>';
            }
            $flashMessages .= '</div>';
        }
        $html .= "
        $flashMessages
        <div id='content-area'>
        <noscript>
        <div class='warning'><b>Note</b>: Many features of this site will not work without javascript</div>
        </noscript>
        $content
        </div>";

        // Get preferred language
        $currentLanguage = 'en';
        if (app()->language()) {
            $currentLanguage = app()->language()->code;
        } elseif (User::current()) {
            $currentLanguage = User::current()->getLanguage()->code;
        }

        $languageLinks = '';
        foreach (Language::all() as $lang) {
            $asterisk = '';
            $selected = '';
            if (!$lang->locale && ($lang->code != 'en')) {
                $asterisk = '*';
            }
            if ($lang->code == $currentLanguage) {
                $selected = "class='selected'";
            }
            $languageLinks .= "<li $selected><a rel='nofollow' href='" . getUrl(
                    'language',
                    ['code' => $lang->code]
                ) . "'> 
            $lang->name 
            </a>$asterisk</li>";
        }

        $more = _('more');
        $less = _('less');
        $html .= '
            <footer>
            <div>
            <table>
            <tr>
            <td>
            <p>'
            . _(
                'Xeno-canto.org is powered by the Xeno-canto Foundation and Naturalis Biodiversity Center'
            ) . "
            </p>
            <p>
            <a href='//www.naturalis.nl/' target='_blank'><img width='147' height='80' src='/static/img/naturalis_logo.png' alt=
            'Naturalis Biodiversity Center'></a>
            </p>
            <p>
            Website &copy; 2005-" . date('Y') . " <b>Xeno-canto Foundation</b>
            </p>
            <p id='license'>" .
            _(
                'Recordings &copy; the recordist. See recording details for license information.'
            ) . "
            </p>
            <p id='license'>" .
            _(
                'Sonogram images &copy; <b>Xeno-canto Foundation</b>. Sonogram images share the same license terms as the recording they depict.'
            ) . "
            </p>
            <p><a href='" . getUrl('termsofuse') . "'>" . htmlspecialchars(
                _(
                    'Terms of use'
                )
            ) . "</a></p>
            <p><a href='" . getUrl('credits') . "'>" . htmlspecialchars(
                _(
                    'Credits'
                )
            ) . "</a></p>
            </td>
            <td>
            <ul class='simple'>
            <li><a href='//www.facebook.com/xenocanto'><img class='icon' width='24' height='24' src='/static/img/facebook.png'> " . _(
                'Like us on Facebook'
            ) . "</a></li>
            <li><a href='//www.twitter.com/xenocanto'><img class='icon' width='24' height='24' src='/static/img/twitter.png'> " . _(
                'Follow us on Twitter'
            ) . "</a></li>
            <li><a href='//www.youtube.com/channel/UC8At4qJ5678S3IX8_n7mstg'><img class='icon' width='24' height='24' src='/static/img/youtube.png'> " . _(
                'Find us on YouTube'
            ) . '</a></li>
            <li>' . obfuscateEmail(
                CONTACT_EMAIL . '?subject=Contact%20xeno-canto',
                "<img class='icon' width='24' height='24' src='/static/img/mail-24.png'> " . _(
                    'Contact us via email'
                )
            ) . "</li>
            <li style='margin-top: 30px;'><a href='" . getUrl('donate') . "'><img src='https://www.paypalobjects.com/en_US/NL/i/btn/btn_donateCC_LG.gif' alt='Donate to Xeno-canto'></a></li>
            </ul>
            </td>
            <td>
            <ul id='languages'>
            $languageLinks
            </ul>
            <p>* " . htmlspecialchars(_('Only species names are translated')) . "</p>
            </td>
            </tr>
            </table>
            </div>
            </footer>
            <script type='text/javascript'>
            jQuery(document).ready(
                function () {
                    // set up collapsible 'read more' sections
                    jQuery('.readmore').expander({slicePoint:40, expandText:'$more&nbsp;&raquo;', userCollapseText: '&laquo;&nbsp;$less', widow: 2 });
                }
            );
            </script>";

        $gaq = GOOGLE_ANALYTICS_TRACKING_ID;
        if ($gaq) {
            $html .= "
            <script type='text/javascript'>
                var _gaq = _gaq || [];
                _gaq.push(['_setAccount', '$gaq']);
                _gaq.push(['_trackPageview']);
                
                (function () {
                    var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
                    ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
                    var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
                })();
            </script>";
        }

        $html .= "
        <script type='text/javascript' src='/static/js/jplayer/jquery.jplayer.min.js'></script>
        <script type='text/javascript' src='/static/js/jplayer/xcplayer.js?$this->tag'></script>
        <script type='text/javascript' src='/static/js/jquery.autocomplete-min.js'></script>
        <script type='text/javascript' src='/static/js/jquery.placeholder.min.js'></script>
        <script type='text/javascript' src='/static/js/jquery.expander.min.js'></script>
        <script type='text/javascript' src='/static/js/jquery.fancybox.pack.js'></script>
        <script type='text/javascript' src='/static/js/jquery.qtip.min.js'></script>
        <script type='text/javascript' src='/static/js/rate-recording.js?$this->tag'></script>
        <script type='text/javascript' src='/static/js/hoverIntent.js'></script>
        <script type='text/javascript' src='/static/js/superfish.js'></script>
        <script type='text/javascript' src='/static/js/xc-generic.js?$this->tag'></script>
        </body>
        </html>
        ";

        return $html;
    }

    public function addCssInclude($include)
    {
        $this->cssIncludes[] = $include;
    }

    public function addHeaderData($data)
    {
        $this->headerData .= "$data\n";
    }

}
