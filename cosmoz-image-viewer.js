/*global document, Polymer, Cosmoz, window, PhotoSwipe, PhotoSwipeUI_Default */
(function () {

	'use strict';

	Polymer({
		behaviors: [
			Polymer.IronResizableBehavior,
			Cosmoz.TemplateHelperBehavior,
			Cosmoz.TranslatableBehavior
		],

		is: 'cosmoz-image-viewer',

		properties: {
			currentImage: {
				type: Object,
				notify: true,
				computed: '_computeCurrentImage(currentImageIndex, images)',
			},
			currentImageIndex: {
				type: Number,
				notify: true,
				observer: '_currentImageIndexChanged'
			},
			/**
			 * Like currentImageIndex + 1; Starts at 1 instead of 0.
			 */
			selectedImageNumber: {
				type: Number,
				notify: true
			},
			currentPage: {
				type: Number,
				computed: '_computePage(currentImageIndex)'
			},
			isDetached: {
				type: Boolean,
				value: false,
				readOnly: true,
				notify: true,
				observer: '_detachedChanged'
			},
			images: {
				type: Array,
				observer: '_imageListChanged'
			},
			_resolvedImages: {
				type: Array,
				computed: '_computeResolvedImages(images)'
			},
			/**
			 * Disable button to detach image
			 */
			noDetach: {
				type: Boolean,
				value: false
			},
			scrollPercent: {
				type: Number,
				notify: true
			},
			src: {
				type: String,
				notify: true
			},
			/**
			 * Sizing of the image in the container.
			 * Options are: null, cover, contain
			 */
			sizing: {
				type: String
			},
			/**
			 * Placeholder image showed while image is loading.
			 */
			placeholder: {
				type: String
			},
			/**
			 * Height of the element.
			 */
			height: {
				type: String,
				value: '300px',
				observer: '_heightValueChanged'
			},
			/**
            * Show navigation next/prev buttons
            */
			nav: {
				type: Boolean,
				value: false,
			},
			/**
			* Show navigation dots
			*/
			dots: {
				type: Boolean,
				value: false,
			},
			/**
			* If true, fullscreen when click on image
			*/
			fullscreenOverlay: {
				type: Boolean,
				value: false,
				reflectToAttribute: true
			},
			imageLoaded: {
				type: Boolean,
				value: false,
			},
			_imageContainerHeight: {
				type: Number
			},
			_scroller: {
				type: Object
			},
			_pswp: {
				type: Object
			}
		},
		listeners: {
			'iron-resize': '_onResize'
		},
		observers: [
			'scrollToPercent(imageLoaded, scrollPercent, _imageContainerHeight)',
			'_selectedImageNumberChanged(selectedImageNumber, images)'
		],

		ready: function () {
			this.set('_scroller', this.$.imageContainer);
		},

		_checkCurrentImageLoaded() {
			// Wait for selected class to be set on div.
			setTimeout(() => {
				this._setImageLoaded();
			}, 50);
		},

		_setImageLoaded() {
			let selectedDiv,
				ironImage;

			selectedDiv = Array.from(this.$.carousel.children).find(child => {
				return Array.from(child.classList).some(c => c === 'selected');
			});

			if (!selectedDiv) {
				return;
			}

			ironImage = Array.from(selectedDiv.children).find(child => child.nodeName === 'IRON-IMAGE');
			this.imageLoaded = ironImage.loaded;
		},

		_imageLoaded(e) {
			let ironImage = e.currentTarget,
				div = ironImage.parentNode;
			if (Array.from(div.classList).indexOf('selected') > -1) {
				this.imageLoaded = ironImage.loaded;
			}
		},

		_heightValueChanged(height) {
			this.updateStyles({'--cosmoz-image-viewer-height': height});
		},

		_computeCurrentImage: function (index, array) {
			if (!array) {
				return;
			}
			return array[index];
		},

		_computeResolvedImages(images) {
			if (!images) {
				return;
			}
			return images.map(i => this.resolveUrl(i));
		},

		_selectedImageNumberChanged(imageNumber, images) {
			this.currentImageIndex = imageNumber - 1;

			if (!images || !Polymer.Element) {
				return;
			}
			// If nav buttons get deactivated, a tap of them opens
			// fullscreen photoSwipe on Polymer 2.
			// CSS --skeleton-carousel-nav-disabled ... doesn't work here.
			if (parseInt(imageNumber, 10) === this.images.length) {
				this.$$('skeleton-carousel').$.next.style.pointerEvents = 'all';
				return;
			}

			if (parseInt(imageNumber, 10) === 1) {
				this.$$('skeleton-carousel').$.prev.style.pointerEvents = 'all';
			}
		},

		_currentImageIndexChanged(index) {
			this.selectedImageNumber = index + 1;
		},

		_onResize: function () {
			this.set('_imageContainerHeight', this._scroller.scrollHeight);
		},

		_computePage: function (index) {
			return index + 1;
		},

		_detachedChanged: function (value) {
			this.hidden = value;
		},

		_imageListChanged: function (newlist) {
			if (!newlist) {
				return;
			}
			this.currentImageIndex = 0;
		},

		nextImage() {
			if (this.currentImageIndex + 1 === this.images.length) {
				return;
			}
			this.currentImageIndex += 1;
		},

		previousImage() {
			if (this.currentImageIndex === 0) {
				return;
			}
			this.currentImageIndex -= 1;
		},

		attach: function () {
			var sharedWindow = new Polymer.IronMeta({type: 'cosmoz-image-viewer', key: 'detachedWindow'}),
				sharedWindowInstance = sharedWindow.byKey('detachedWindow');

			if (sharedWindowInstance) {
				sharedWindowInstance.close();
			}
		},

		detach: function () {
			var sharedWindow = new Polymer.IronMeta({type: 'cosmoz-image-viewer', key: 'detachedWindow'}),
				sharedWindowInstance = sharedWindow.byKey('detachedWindow'),
				detachedContentUrl = this.resolveUrl('detached.html'),
				swiper,
				rawFile,
				w;

			if (sharedWindowInstance) {
				window.open(undefined, 'OCR', 'height=700,width=800');
				swiper = sharedWindowInstance.document.querySelector('#sw');
				swiper.images = this.images.map(i => this.resolveUrl(i));
				swiper.startIndex = this.currentImageIndex;
				return;
			}

			w = window.open(undefined, 'OCR', 'height=700,width=800');

			rawFile = new XMLHttpRequest();
			rawFile.open('GET', detachedContentUrl, false);
			rawFile.onreadystatechange = () => {
				if (rawFile.readyState === 4) {
					if (rawFile.status === 200 || rawFile.status === 0) {
						w.document.open();
						w.document.write(rawFile.responseText);
						w.document.close();
					}
				}
			};
			rawFile.send(null);

			w.document.title = this._('Cosmoz Image Viewer');
			w.addEventListener('ready', (e) => {
				var swiper = e.detail;
				swiper.images = this.images.map(i => this.resolveUrl(i));
				swiper.startIndex = this.currentImageIndex;
				swiper.init();
			});
			w.addEventListener('beforeunload', function () {
				this._setIsDetached(false);
				this.notifyResize();
				sharedWindow.value = undefined;
			}.bind(this));
			this._setIsDetached(true);
			sharedWindow.value = w;
			this.notifyResize();
		},

		modalImageViewer: function (element, items, index) {
			new PhotoSwipe(element, PhotoSwipeUI_Default, items, {
				index: index || 0, // start at first slide
				history: false, // disables unique URL for each slide.
				preLoad: [1, 3], // Preloads one image before current image and three after.,
				closeOnScroll: false,
				loadingIndicatorDelay: 0,
				hideAnimationDuration: 0,
				showAnimationDuration: 0,
				showHideOpacity: false,
				shareEl: false
			}).init();
		},

		scrollHandler: function () {
			this.debounce('updateScrollPercent', function () {
				var top = this._scroller.scrollTop,
					height = this._imageContainerHeight,
					percent = Math.round(top / height * 100);
				if (percent !== this.scrollPercent) {
					this.set('scrollPercent', percent);
				}
			}.bind(this), 100);
		},

		scrollToPercent: function (loaded, percent, height) {
			if (!loaded || !this._scroller) {
				return;
			}
			var topPx = height * (percent / 100);

			this._scroller.scrollTop = topPx;
		},

		enterFullscreen: function () {
			if (!this.fullscreenOverlay) {
				return;
			}
			var items = [];
			this.images.forEach(function (image) {
				items.push({
					src: this.resolveUrl(image),
					w: 1105,
					h: 1562
				});
			}, this);
			this.modalImageViewer(this._pswp, items, this.currentImageIndex);
		}
	});
}());
