function collection_factory(json_path) {
    return fetch(json_path)
        .then(response => response.json())
        .then(collection => {
            var collection_items = []
            collection.forEach((item, index) => {
                if (item.hasOwnProperty('video'))
                    collection_items.push(
                        new CollectionItem(item)
                    );
            });
            return collection_items;
        })
}

class CollectionItem {
    constructor(collection_item_cfg) {
        this.cfg = collection_item_cfg;
        this.resolved_poster = null;
        this.resolved_description = null;
    }

    get_title() {
        return this.cfg.title.trim();
    }

    get_id() {
        return this.cfg.id;
    }

    get_video() {
        return this.cfg.video.trim();
    }

    get_description() {
        if (this.cfg.hasOwnProperty('description')) return this.cfg.description;

        if (this.resolved_description !== null) return this.resolved_description;

        var md_path = this.get_video().replace(/\.[^.]+$/, '.md');
        if (this.cfg.hasOwnProperty('description_md')) {
            md_path = this.cfg.description_md.trim();
        };

        CollectionItem.loadMarkdown(md_path)
            .then(x => {
                this.resolved_description = x;
            })
            .catch(function (error) {
                this.resolved_description = "";
                console.log(error)
            });
    }

    get_poster() {
        if (this.cfg.hasOwnProperty('poster')) return this.cfg.poster.trim();

        if (this.resolved_poster !== null) return this.resolved_poster;

        CollectionItem.getVideoPoster(
            this.get_video(),
            poster => {
                this.resolved_poster = poster;
            },
            error => {
                console.log("Error on creating poster from video");
            }
        );
    }

    static loadMarkdown(path) {
        return fetch(path.trim())
            .then(function (response) {
                if (!response.ok) {
                    throw new Error("Failed to load Markdown file: " + response.status);
                }

                return response.text();
            });
    }

    static getVideoPoster(videoUrl, onSuccess, onError) {
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.src = videoUrl;
        video.currentTime = 0.001;

        video.addEventListener('seeked', function () {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0);
            onSuccess(canvas.toDataURL('image/jpeg'));
        }, { once: true });

        video.addEventListener('error', function (e) {
            if (onError) onError(e);
        }, { once: true });
    }
}