module.exports = (sequelize, DataTypes) => {
    return sequelize
        .define('code_room_revisions', {
            code_room_revision_id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            code_room_id: DataTypes.INTEGER,
            user_id: DataTypes.INTEGER,
            hash: DataTypes.STRING,
            op: DataTypes.STRING,
            start: DataTypes.INTEGER,
            end: DataTypes.INTEGER,
            m_sl: DataTypes.INTEGER,
            m_el: DataTypes.INTEGER,
            m_sc: DataTypes.INTEGER,
            m_ec: DataTypes.INTEGER,
            code: DataTypes.TEXT('medium'),
            created_at: DataTypes.DATE
        },
        {
            freezeTableName: true,

            hooks: {
                beforeCreate(instance) {
                    instance.created_at = util.now();
                }
            }
        }
    );
};
