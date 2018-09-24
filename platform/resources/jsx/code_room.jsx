class CodeRoom extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            room_hash: props.room_hash,
            hash: props.hash,
            session: +new Date() + '.' + Math.random(),
            language: 'javascript',
            new_code: false,
            modifying: false,
            users: []
        };
    }

    componentDidMount() {
        var editor = monaco.editor.create(document.getElementById('editor'), {
            theme: 'vs-dark',
            value: this.props.code,
            language: this.state.language,
            automaticLayout: true,
            fontSize: 16,
            readOnly: this.props.read_only
        });

        editor.current_hash = this.props.hash;
        editor.revisions = [];

        axios
            .get('/coderoom/users/' + this.props.room_hash)
            .then(res => {
                this.setState({
                    users: res.data.payload.users.filter(user => user.user_id !== this.props.user_id)
                });
            });

        editor.onDidChangeModelContent(delta => {
            console.log('edits', delta)
            if (this.state.modifying) return null;

            var op_hash = editor.current_hash;
            var current_hash = sha256(editor.getValue());

            editor.current_hash = current_hash;

            editor.revisions.push({
                collab: false,
                op_hash,
                delta
            });

            setTimeout(() => {
                return axios
                    .post('/coderoom/sync', {
                        room_hash: this.state.room_hash,
                        op_hash,
                        current_hash,
                        session: this.state.session,
                        delta
                    })
                    .then(res => {
                        console.log(res);
                    });
            }, 2000)
        })

        io.socket.on('coderoom_' + this.state.room_hash, data => {
            switch (data.action) {
                case 'join':
                    if (data.user_id === this.props.user_id) break;

                    this.setState(prev => {
                        return {
                            users: prev.users.concat([{
                                user_id: data.user_id,
                                display_name: data.display_name,
                                avatar_url: data.avatar_url
                            }])
                        }
                    });
                    break;
                case 'leave':
                    this.setState(prev => {
                        return {
                            users: prev.users.filter(user => user.user_id !== data.user_id)
                        }
                    });
                    break;
                case 'sync':
                    if (data.session === this.state.session) return null;

                    this.state.modifying = true;

                    if (data.op_hash !== editor.current_hash) {
                        // transform
                        console.log('needs transform');
                        var operations = [];

                        for (var i = editor.revisions.length - 1; i >= 0; --i) {
                            if (editor.revisions[i].op_hash === data.op_hash) {
                                operations = editor.revisions.slice(i);
                                break;
                            }
                        }

                        console.log('operations', operations);

                        operations.forEach(d => {
                            var change = d.delta.changes[0];

                            const line_delta = change.text !== ''
                                ? change.text.split('').filter(c => c === '\n').length
                                : (change.range.endLineNumber - change.range.startLineNumber) * -1;

                            if (change.range.startLineNumber <= data.delta.changes[0].range.startLineNumber) {
                                data.delta.changes[0].range.startLineNumber += line_delta;
                                data.delta.changes[0].range.endLineNumber += line_delta;
                            }
                        });
                    }

                    editor.revisions.push({
                        collab: true,
                        op_hash: data.op_hash,
                        delta: data.delta
                    });

                    data.delta.changes.forEach(change => {
                        var range = new monaco.Range(
                            change.range.startLineNumber,
                            change.range.startColumn,
                            change.range.endLineNumber,
                            change.range.endColumn);

                        // this is necessary to deal with monaco not allowing api edits in read only
                        var flip_ro = this.props.read_only;

                        if (flip_ro) editor.updateOptions({readOnly: false});

                        editor.executeEdits('/', [{
                            range,
                            text: change.text,
                            forceMoveMarkers: change.forceMoveMarkers
                        }]);

                        editor.current_hash = sha256(editor.getValue());

                        if (flip_ro) editor.updateOptions({readOnly: true});
                    });

                    this.state.modifying = false;
                    break;
            }
        });
    }

    render() {
        return (
            <div class="em_code_room">
                <div id="editor"></div>
                <div class="users">
                    {
                        this.state.users &&
                        this.state.users.map(user => <img key={user.user_id} src={user.avatar_url} />)
                    }
                </div>
            </div>
        )
    }

}
