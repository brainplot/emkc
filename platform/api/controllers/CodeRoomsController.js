const crypto = require('crypto');

module.exports = {

    create(req, res) {
        return db.code_rooms
            .create({
                user_id: req.glob.user_id || null
            })
            .then(room => {
                return res.redirect(room.url);
            });
    },

    view(req, res) {
        const { room_hash } = req.params;

        return db.code_rooms
            .find_one({
                where: {
                    room_hash
                }
            })
            .then(room => {
                if (!room) throw null;

                return res.view({
                    room,
                    code: room.code.split('\n')
                });
            })
            .catch(err => {
                return res.redirect('/coderooms');
            });
    },

    users(req, res) {
        const { room_hash } = req.params;

        code_rooms.redis.get('coderoom:' + room_hash, (err, data) => {
            data = data ? JSON.parse(data) : [];

            return res.send({
                status: 'ok',
                payload: {
                    users: data
                }
            });
        });
    },

    sync(req, res) {
        const { room_hash, session, delta } = req.body;
        var { op_hash } = req.body;

console.log(JSON.stringify(delta, null, 4))
        var orig_delta = JSON.parse(JSON.stringify(delta))

        var room;

        return db.sequelize
            .transaction(t => {
                return db.code_rooms
                    .find_one({
                        where: {
                            room_hash
                        },
                        transaction: t,
                        lock: t.LOCK.UPDATE
                    })
                    .then(room_data => { room = room_data;
                        if (!room) throw null;

                        if (room.hash === op_hash) return null;

                        return db.sequelize
                            .query(`
                                select *
                                from code_room_revisions
                                where code_room_id = ? and
                                code_room_revision_id >= (
                                    select code_room_revision_id
                                    from code_room_revisions
                                    where hash = ?
                                    order by code_room_revision_id desc
                                    limit 1
                                )
                                order by code_room_revision_id;
                            `, {
                                replacements: [
                                    room.code_room_id,
                                    op_hash
                                ],
                                type: db.sequelize.QueryTypes.SELECT,
                            })
                    })
                    .then(diff => {
                        console.log(diff);
                        var change = delta.changes[0];
console.log('change1', change)
                        if (diff && diff.length > 0) {
                            // transform change
                            diff.for_each(d => {
                                const line_delta = d.op === 'ins'
                                    ? d.code.split('').filter(c => c === '\n').length
                                    : (d.m_el - d.m_sl) * -1;

                                if (change.range.startLineNumber >= d.m_sl) {
                                    change.range.startLineNumber += line_delta;
                                    change.range.endLineNumber += line_delta;
                                    if (d.op === 'ins') {
                                        change.rangeOffset += d.code.length;
                                    } else {
                                        change.rangeOffset += (change.rangeOffset - d.start);
                                    }
                                }
                            });
                        }

                        var current_hash = crypto.createHash('sha256').update(room.code).digest('hex');
console.log('change2', change)
                        var op = change.text === '' ? 'del' : 'ins';
                        var code = change.text;
                        var start = change.rangeOffset;
                        var len = change.rangeLength;
                        var end = start + len;

                        if (op === 'ins') {
                            room.code = [room.code.slice(0, start), code, room.code.slice(start + len)].join('');
                        } else {
                            room.code = [room.code.slice(0, start), room.code.slice(end)].join('')
                        }

                        room.hash = crypto.createHash('sha256').update(room.code).digest('hex');

                        return room
                            .save({ transaction: t })
                            .then(() => {
                                return db.code_room_revisions
                                    .create({
                                        code_room_id: room.code_room_id,
                                        user_id: req.glob.user_id,
                                        hash: current_hash,
                                        op,
                                        start,
                                        end,
                                        code,
                                        m_sl: change.range.startLineNumber,
                                        m_el: change.range.endLineNumber,
                                        m_sc: change.range.startColumn,
                                        m_ec: change.range.endColumn,
                                    }, {
                                        transaction: t
                                    });
                            });
                    })
            })
            .then(() => {
                sails.io.sockets
                    .emit('coderoom_' + room_hash, {
                        action: 'sync',
                        room_hash,
                        session,
                        op_hash,
                        delta: orig_delta
                    });

                return res.send({
                    status: 'ok'
                });
            })
            .catch(err => {console.log(err)
                return res.send({
                    status: 'error'
                });
            });
    },

    _config: {}

};
