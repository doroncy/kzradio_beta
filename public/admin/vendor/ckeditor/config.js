/*
Copyright (c) 2003-2011, CKSource - Frederico Knabben. All rights reserved.
For licensing, see LICENSE.html or http://ckeditor.com/license
*/

CKEDITOR.editorConfig = function( config )
{
	// Define changes to default configuration here. For example:
	config.language = 'he';
    config.forcePasteAsPlainText = true;
    config.extraPlugins = 'youtube';
	// config.uiColor = '#AADC6E';
	config.toolbar = [
   ['Source'],['Bold','Italic','Underline','StrikeThrough','-','Outdent','Indent','-','Blockquote'],
   ['NumberedList','BulletedList','-','BidiRtl','BidiLtr','-','JustifyRight','JustifyCenter','JustifyLeft','JustifyBlock'],
   ['Link'],['Youtube']
	] ;
};
