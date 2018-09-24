module.exports = (sequelize, DataTypes) => {
    return sequelize
        .define('code_rooms', {
            code_room_id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            user_id: DataTypes.INTEGER,
            room_hash: DataTypes.STRING,
            code: DataTypes.TEXT('medium'),
            hash: DataTypes.STRING,
            created_at: DataTypes.DATE
        },
        {
            freezeTableName: true,

            hooks: {
                async beforeCreate(instance) {
                    instance.created_at = util.now();
                    instance.hash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

                    var letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

                    for (;;) {
                        instance.room_hash = '';
                        for (var i = 0; i < 6; ++i) {
                            instance.room_hash += letters[Math.floor(Math.random() * letters.length)];
                        }

                        var dupe = await db.code_rooms
                            .find_one({
                                where: {
                                    hash: instance.room_hash
                                }
                            });

                        if (!dupe) break;
                    }
                }
            },

            getterMethods: {
                url() {
                    return '/r/' + this.room_hash;
                }
            }
        }
    );
};
