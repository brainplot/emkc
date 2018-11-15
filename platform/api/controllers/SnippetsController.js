const fs = require('fs');
const q = require('q');

module.exports = {

    view(req, res) {
        const { hash } = req.params;

        return db.snippets
            .find_one({
                where: {
                    hash
                }
            })
            .then(snippet => {
                if (!snippet) throw null;

                return res.view({
                    snippet
                });
            })
            .catch(err => {
                return res.redirect('/snippets');
            });
    },

    create(req, res) {
        if (req.method === 'POST') {
            const { language, snip } = req.body;

            return Promise.resolve(null)
                .then(() => {
                    if (!snip) {
                        throw new Error('Please supply some code');
                    }

                    return db.snippets
                        .create({
                            user_id: req.glob.user_id || null,
                            language,
                            snip
                        });
                })
                .then(snippet => {
                    return res.send({
                        status: 'ok',
                        payload: {
                            url: snippet.url
                        }
                    });
                })
                .catch(err => {
                    return res.send({
                        status: 'error',
                        payload: {
                            message: err.message
                        }
                    });
                });
        }
        return res.view();
    },

    list(req, res) {
        return Promise.resolve(null)
            .then(() => {
                return [
                    db.snippets
                        .find_all({
                          // no need to filter, get everything!
                        })
                ];
            })
            .spread(snippets => {
                return res.view({
                    snippets: snippets.map(s => {
                        return {
                            snippet_id: s.snippet_id,
                            snip: s.snip,
                            hash: s.hash,
                            user_id: s.user_id,
                            created_at: s.created_at,
                        }
                    })
                });
            });
    },

    _config: {}

};
