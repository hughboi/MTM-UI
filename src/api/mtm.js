import moment from 'moment';
import axios from 'axios';
import Song from '../entities/Song.js';
import SongRank from '../entities/SongRank.js';
import MediaItem from '../entities/MediaItem.js';
import ChartPosition from '../entities/ChartPosition.js';

const BASE_URL = "http://localhost:8888/api";

export default class MusicAPI {
    
    constructor() { }
    
    /**
    * Handles errors in request
    */
    static handleError = (error) => {
        var message = "Unreachable server error";
        if (error.response.data.errors[0] != undefined) {
            message = error.response.data.errors[0].details;
        }
        
        throw new Error(message);
    };
    
    /**
    * Get songs in the billboard chart in a given date
    */
    static getChart = (date) => {
        
        let BILLBOARD_URL = "http://localhost:9006/billboard/charts/" + date + "?filter=song";
        
        return axios.get(BILLBOARD_URL)
        .then(function (res) {
            
            let result = res.data;
            let chart = [];
            
            result.forEach((chartItem) => {
                chart.push(new ChartPosition(chartItem['rank'], chartItem['song_id'], chartItem['song_name'], chartItem['display_artist']));
            });
            
            return chart;
        })
        .catch(function (error) {
            MusicAPI.handleError(error);
        });
    };
    
    static getChart1 = (data) => {
        
        let query = `SELECT DISTINCT ?position ?name ?id ?name1 
        WHERE {
            ?Chart a schema:MusicPlaylist;
            schema:datePublished "${date}";
            schema:track ?ListItem0.
            ?ListItem0 a schema:ListItem;
            schema:item ?Song;
            schema:position ?position.
            ?Song a schema:MusicRecording;
            schema:name ?name;
            schema:byArtist ?Artist;
            billboard:id ?id.
            ?Artist a schema:MusicGroup;
            schema:name ?name1
        }`;
        
        let LRA_URL = "http://localhost:9000/api/lra/query?q=" + encodeURIComponent(query);
        
        return axios.get(LRA_URL)
        .then(function (res) {
            
            let result = res.data.table.rows;
            let chart = [];
            
            result.forEach((chartItem) => {
                chart.push(new ChartPosition(chartItem['?position'], chartItem['?id'], chartItem['?name'], chartItem['?name1']));
            });
            
            return chart;
        })
        .catch(function (error) {
            MusicAPI.handleError(error);
        });
    };
    
    /**
    * Get song information given an id
    */
    static getSongInfo = (id) => {
        let BILLBOARD_URL = "http://localhost:9006/billboard/music/song/" + id;
        
        // Use billboard to get spotify ID
        return axios.get(BILLBOARD_URL)
        .then( function (res) {
            let billboard_result = res.data.song;
            let SPOTIFY_TRACK_URL = "http://localhost:9007/spotify/v1/tracks/" + billboard_result.spotify_id;
            
            // Use spotify track get request to retrive song info, and album ID
            return axios.get(SPOTIFY_TRACK_URL)
            .then( function (res) {
                let spotify_track_result = res.data;
                let SPOTIFY_ALBUM_URL = "http://localhost:9007/spotify/v1/albums/" + spotify_track_result.album.id;
                
                return axios.get(SPOTIFY_ALBUM_URL)
                .then( function (res) {
                    let spotify_album_result = res.data;
                    
                    // Create the song to return
                    let song = new Song(billboard_result.song_id, billboard_result.song_name, 
                        billboard_result.display_artist, spotify_album_result.name, spotify_album_result.release_date,
                        spotify_track_result.duration_ms, spotify_track_result.external_urls['spotify'],
                        spotify_album_result.images[0].url);
                    return song;                    
                })
                .catch(function (error) {
                    MusicAPI.handleError(error);
                });
            })
            .catch(function (error) {
                MusicAPI.handleError(error);
            });
        })
        .catch(function (error) {
            MusicAPI.handleError(error);
        });
    }
    
    /**
    * Get historical ranks of a song given an id
    */
    static getSongRankings = (id) => {
        let requestUrl = BASE_URL + "/songs/" + id + "/ranks";
        
        return axios.get(requestUrl)
        .then(function (res) {
            let result = res.data.data;
            let rankings = [];
            
            result.forEach((ranking) => {
                rankings.push(new SongRank(ranking.endDate, ranking.rank));
            });
            
            return rankings;
        })
        .catch(function (error) {
            MusicAPI.handleError(error);
        });
    }
    
    /**
    * Get related media of a song given an id.
    */
    static getSongMedia = (id) => {
        let requestUrl = BASE_URL + "/songs/" + id + "/media"
        
        return axios.get(requestUrl)
        .then(function (res) {
            let result = res.data.data;
            let media = [];
            
            result.forEach((mediaObj) => {
                media.push(new MediaItem(mediaObj.url, mediaObj.caption,
                    mediaObj.thumbnail));
                });
                
                return media;
            })
            .catch(function (error) {
                MusicAPI.handleError(error);
            });
        }
    }
    