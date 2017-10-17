(function ($) {
    var SUCCESSFUL = 0;
    var UNTESTED   = 1;
    var FAILED     = 2;
    var TESTING    = 3;

    $('#provider_list table').sortable({
        containerSelector: 'table',
        itemPath: '> tbody',
        itemSelector: 'tr',
        placeholder: '<tr class="placeholder"/>',
        delay: 500,
        onDrop: function (item, container, _super) {
            _super(item, container);

            var ids = [];
            $('tbody tr td:first-child', container.el[0]).each(function (idx, element) {
                ids.push($(element).data('provider-id'));
            });

            $.ajax({
                url: '/admin/providers/reorder',
                method: 'POST',
                data: {
                    providers: ids
                }
            });
        }
    });

    $('#provider').on('show.bs.modal', function (event) {
        var button = $(event.relatedTarget);
        var modal = $(this);
        var title = trans('providers.create');

        $('.btn-danger', modal).hide();
        $('.callout-danger', modal).hide();
        $('.has-error', modal).removeClass('has-error');
        $('.label-danger', modal).remove();

        if (button.hasClass('btn-edit')) {
            title = trans('providers.edit');
            $('.btn-danger', modal).show();
        } else {
            $('#provider_id').val('');
            $('#provider_name').val('');
            $('#provider_slug').val('');
            $('#provider_icon').val('');
            $('#provider_description').val('');
        }

        modal.find('.modal-title span').text(title);
    });

    $('body').delegate('.provider-trash button.btn-delete','click', function (event) {
        var target = $(event.currentTarget);
        var icon = target.find('i');
        var dialog = target.parents('.modal');

        icon.addClass('ion-refresh fixhub-spin');
        dialog.find('input').attr('disabled', 'disabled');
        $('button.close', dialog).hide();

        var provider = Fixhub.Providers.get($('#model_id').val());

        provider.destroy({
            wait: true,
            success: function(model, response, options) {
                dialog.modal('hide');
                $('.callout-danger', dialog).hide();

                icon.removeClass('ion-refresh fixhub-spin');
                $('button.close', dialog).show();
                dialog.find('input').removeAttr('disabled');
            },
            error: function() {
                icon.removeClass('ion-refresh fixhub-spin');
                $('button.close', dialog).show();
                dialog.find('input').removeAttr('disabled');
            }
        });
    });

    $('#provider button.btn-save').on('click', function (event) {
        var target = $(event.currentTarget);
        var icon = target.find('i');
        var dialog = target.parents('.modal');

        icon.addClass('ion-refresh fixhub-spin');
        dialog.find('input').attr('disabled', 'disabled');
        $('button.close', dialog).hide();

        var provider_id = $('#provider_id').val();

        if (provider_id) {
            var provider = Fixhub.Providers.get(provider_id);
        } else {
            var provider = new Fixhub.Provider();
        }

        provider.save({
            name:        $('#provider_name').val(),
            slug:        $('#provider_slug').val(),
            icon:        $('#provider_icon').val(),
            description: $('#provider_description').val()
        }, {
            wait: true,
            success: function(model, response, options) {
                dialog.modal('hide');
                $('.callout-danger', dialog).hide();

                icon.removeClass('ion-refresh fixhub-spin');
                $('button.close', dialog).show();
                dialog.find('input').removeAttr('disabled');

                if (!provider_id) {
                    Fixhub.Providers.add(response);
                }
            },
            error: function(model, response, options) {
                $('.callout-danger', dialog).show();

                var errors = response.responseJSON;

                $('.has-error', dialog).removeClass('has-error');
                $('.label-danger', dialog).remove();

                $('form input', dialog).each(function (index, element) {
                    element = $(element);

                    var name = element.attr('name');

                    if (typeof errors[name] !== 'undefined') {
                        var parent = element.parent('div');
                        parent.addClass('has-error');
                        parent.append($('<span>').attr('class', 'label label-danger').text(errors[name]));
                    }
                });

                icon.removeClass('ion-refresh fixhub-spin');
                $('button.close', dialog).show();
                dialog.find('input').removeAttr('disabled');
            }
        });
    });


    Fixhub.Provider = Backbone.Model.extend({
        urlRoot: '/admin/providers'
    });

    var Providers = Backbone.Collection.extend({
        model: Fixhub.Provider,
        comparator: function(providerA, providerB) {
            if (providerA.get('name') > providerB.get('name')) {
                return -1; // before
            } else if (providerA.get('name') < providerB.get('name')) {
                return 1; // after
            }

            return 0; // equal
        }
    });

    Fixhub.Providers = new Providers();

    Fixhub.ProvidersTab = Backbone.View.extend({
        el: '#app',
        events: {

        },
        initialize: function() {
            this.$list = $('#provider_list tbody');

            $('#no_providers').show();
            $('#provider_list').hide();

            this.listenTo(Fixhub.Providers, 'add', this.addOne);
            this.listenTo(Fixhub.Providers, 'reset', this.addAll);
            this.listenTo(Fixhub.Providers, 'remove', this.addAll);
            this.listenTo(Fixhub.Providers, 'all', this.render);

            Fixhub.listener.on('provider:' + Fixhub.events.MODEL_CHANGED, function (data) {
                var provider = Fixhub.providers.get(parseInt(data.model.id));

                if (provider) {
                    provider.set(data.model);
                }
            });

            Fixhub.listener.on('provider:' + Fixhub.events.MODEL_CREATED, function (data) {
                    Fixhub.Providers.add(data.model);
            });

            Fixhub.listener.on('provider:' + Fixhub.events.MODEL_TRASHED, function (data) {
                var provider = Fixhub.Providers.get(parseInt(data.model.id));

                if (provider) {
                    Fixhub.Providers.remove(provider);
                }
            });
        },
        render: function () {
            if (Fixhub.Providers.length) {
                $('#no_providers').hide();
                $('#provider_list').show();
            } else {
                $('#no_providers').show();
                $('#provider_list').hide();
            }
        },
        addOne: function (provider) {

            var view = new Fixhub.ProviderView({
                model: provider
            });

            this.$list.append(view.render().el);

            if (Fixhub.Providers.length < 2) {
                $('.drag-handle', this.$list).hide();
            } else {
                $('.drag-handle', this.$list).show();
            }
        },
        addAll: function () {
            this.$list.html('');
            Fixhub.Providers.each(this.addOne, this);
        }
    });

    Fixhub.ProviderView = Backbone.View.extend({
        tagName:  'tr',
        events: {
            'click .btn-edit': 'edit',
            'click .btn-delete': 'trash'
        },
        initialize: function () {
            this.listenTo(this.model, 'change', this.render);
            this.listenTo(this.model, 'destroy', this.remove);

            this.template = _.template($('#provider-template').html());
        },
        render: function () {
            var data = this.model.toJSON();

            this.$el.html(this.template(data));

            return this;
        },
        edit: function() {
            $('#provider_id').val(this.model.id);
            $('#provider_name').val(this.model.get('name'));
            $('#provider_slug').val(this.model.get('slug'));
            $('#provider_icon').val(this.model.get('icon'));
            $('#provider_description').val(this.model.get('description'));

        },
        trash: function() {
            var target = $('#model_id');
            target.val(this.model.id);
            target.parents('.modal').removeClass().addClass('modal fade provider-trash');
        }
    });
})(jQuery);