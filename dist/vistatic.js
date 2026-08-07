function collection_factory(json_path) {
    return fetch(json_path)
        .then(response => response.json())
        .then(collection => {
            const items_ids = new Set();
            var collection_items = [];
            collection.forEach((item, index) => {
                if (item.hasOwnProperty('video')) {
                    collection_items.push(
                        new CollectionItem(item)
                    );

                    let id = collection_items[collection_items.length - 1].get_id();
                    if (items_ids.has(id))
                        alert("Duplicated id detected");
                    else
                        items_ids.add(id);
                }
                else
                    alert("Item without 'video' property detected");
            });
            return collection_items;
        })
}

class CollectionItem {
    constructor(collection_item_cfg) {
        this.cfg = collection_item_cfg;
        this.resolved_poster = null;
        this.resolved_description = null;
        this.resolved_title_from_md = null;
        this.resolved_id = null;
    }

    get_title() {
        if (this.cfg.hasOwnProperty('title')) return this.cfg.title.trim();

        if (this.resolved_title_from_md === null) {
            this.get_description(); // call to resolve title from description
        }

        if (this.resolved_title_from_md !== "") {
            return this.resolved_title_from_md;
        }

        let file_name = this.get_video().split('/').pop().replace(/\.[^.]+$/, '');
        return file_name.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
    }

    get_id() {
        if (this.cfg.hasOwnProperty('id')) return this.cfg.id;

        if (this.resolved_id !== null) return this.resolved_id;

        this.resolved_id = CollectionItem.cyrb53(this.get_video());
        return this.resolved_id;
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

                const tokens = marked.lexer(x);
                const h1 = tokens.find(
                    (token) => token.type === "heading" && token.depth === 1
                );
                this.resolved_title_from_md = h1?.text.trim() ?? "";
            })
            .catch(error => {
                this.resolved_description = "";
                this.resolved_title_from_md = "";
            });

        return this.resolved_description ?? "";
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

        return this.resolved_poster ?? "";
    }

    static loadMarkdown(path) {
        return fetch(path.trim(), {mode: 'no-cors'})
            .then(function (response) {
                if (!response.ok) {
                    throw new Error("Failed to load Markdown file: " + response.status);
                }

                return response.text();
            }).catch(function (error) {
                throw new Error("Failed to load Markdown file: " + response.status);
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

    static cyrb53(str, seed = 0) {
        let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
        for (let i = 0, ch; i < str.length; i++) {
            ch = str.charCodeAt(i);
            h1 = Math.imul(h1 ^ ch, 2654435761);
            h2 = Math.imul(h2 ^ ch, 1597334677);
        }
        h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
        h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
        h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
        h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
        // For a single 53-bit numeric return value we could return
        // 4294967296 * (2097151 & h2) + (h1 >>> 0);
        // but we instead return the full 64-bit value:
        return 4294967296 * (2097151 & h2) + (h1 >>> 0).toString(); // [h2>>>0, h1>>>0];
    };
}